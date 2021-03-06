var kclient = angular.module('kurentinoClient', ['templatescache']);
kclient.config(function($logProvider){
    $logProvider.debugEnabled(true);
});
/**
 * Created by joker on 30.12.15.
 */

kclient.controller('mainCtrl', function($scope) {
    // Переменные
    $scope.vars = {
        socket: new WebSocket('wss://' + location.host + ':8025'),
        logged: false,
        sendPeer: null
    };

    // Подключенные участники
    $scope.connectedPeers = [];

    // Словарь пиров
    $scope.peersMap = {};

    // Типы отправляемых сообщений
    $scope.clientMsgTypes = {
        LOGIN: 'login',
        LOGOUT: 'logout',
        CLIENT_ERROR: 'error',
        OFFER: 'offerVideo',
        START_RECORD: 'startRec',
        STOP_RECORD: 'stopRec',
        ON_ICE: 'onIceCandidate',
        OFFER_TO_RECIEVE: 'sendVideoTo'
    };

    // Типы принимаемых сообщений
    $scope.serverMsgTypes = {
        COME_IN: 'comein',
        SERVER_ERROR: 'error',
        ICE: 'iceCandidate',
        OFFER_ANSWER: 'offerAnswer',
        NEW_USER: 'newParter',
        EXISTS_LIST: 'existsList',
        REMOVE_USER: 'removeUser'
    };

    // Доступные устройства
    $scope.audioDevices = [];
    $scope.videoDevices = [];
    $scope.screenDevices = [];

    /**
     * Генерация случайной последователяности симоволов
     * @param n Количество символов
     * @returns {string} Последовательность
     */
    var randWDclassic = function(n) {
        var s ='', abd ='abcdefghijklmnopqrstuvwxyz0123456789', aL = abd.length;
        while(s.length < n)
            s += abd[Math.random() * aL|0];
        return s;
    };

    /**
     * Функция инициализации соединения с сервером
     */
    var initialize = function () {
        $scope.vars.loginName = randWDclassic(9);
        $scope.vars.roomName = 'Тест';

        $scope.$apply();
    };

    /**
     * Логин
     */
    $scope.login = function () {
        console.log('Логинимся: ' + $scope.vars.loginName + ', комната - ' + $scope.vars.roomName);
        var data = {
            id: $scope.clientMsgTypes.LOGIN,
            name: $scope.vars.loginName,
            room: $scope.vars.roomName
        };

        $scope.sendMessage(data);
    };

    /**
     * Создает список устройств
     * @param postCallback Функция обратного вызова
     */
    $scope.createDevicesList = function (postCallback) {
        if (!navigator.enumerateDevices && window.MediaStreamTrack && window.MediaStreamTrack.getSources) {
            navigator.enumerateDevices = window.MediaStreamTrack.getSources.bind(window.MediaStreamTrack);
        }

        if (!navigator.enumerateDevices && navigator.mediaDevices.enumerateDevices) {
            navigator.enumerateDevices = navigator.mediaDevices.enumerateDevices.bind(navigator);
        }

        if (!navigator.enumerateDevices) {
            console.error('Невозможно создать список устройств - нет такой функции...');
        } else {
            var collect = {
                audio: [],
                video: []
            };

            // Проход по устройствам
            navigator.enumerateDevices (function (devices) {
                angular.forEach(devices, function (device) {
                    if(collect[device.kind] !== undefined) {
                        collect[device.kind].push({
                            deviceId: device.id,
                            label: device.label
                        });
                    }
                });

                postCallback(collect.audio, collect.video);
            });
        }
    };

    /**
     * Отправка сообщения
     * @param msg JSON
     */
    $scope.sendMessage = function (msg) {
        var strMsg = JSON.stringify(msg);

        console.log('Сообщение на сервер: ' + strMsg);

        $scope.vars.socket.send(strMsg);
    };

    /**
     * Отправка приглашения на прием видео
     * @param error Ошибка
     * @param offer Информация
     */
    var offerToRecieveVideo = function (error, offer) {
        if(error) {
            return console.error(error);
        }

        var msg = {
            id: $scope.clientMsgTypes.OFFER,
            offer: offer
        };

        $scope.sendMessage(msg);
    };

    /**
     * Создание пира
     */
    var createPeer = function () {
        var mediaOpts = {
            audio: {
                mandatory: {
                    //sourceId: 'ddca89f146312b2a80911aac6f3456be80e2c98323bbd93d06ea9faef17c506a'
                }
            },
            video: {
                mandatory: {
                    //sourceId: 'c1471a8b2425a80883c978ca3d74606e4206a220ef92759f0771c9ddd234e10c',
                    maxWidth: 800,
                    maxHeight: 600,
                    minWidth: 160,
                    minHeight: 120,
                    maxFrameRate: 25
                }
            }
        };

        var vid = $('.vid')[0];

        var options = {
            localVideo: vid,
            mediaConstraints: mediaOpts,
            onicecandidate: function (candidate, wp) {
                console.log('Кандидат со стороны клиента');
                console.log(candidate);

                var message = {
                    id: $scope.clientMsgTypes.ON_ICE,
                    candidate: candidate,
                    name: $scope.vars.loginName
                };

                $scope.sendMessage(message);
            }
        };

        $scope.vars.sendPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, function(error) {
            if(error) {
                return console.log(error);
            }

            this.generateOffer(offerToRecieveVideo);
        });
    };

    /**
     * Сообщение на начало записи
     */
    $scope.startRecord = function () {
        var msg = {
            id: $scope.clientMsgTypes.START_RECORD
        };

        $scope.sendMessage(msg);
    };

    /**
     * Сообщение на остановку записи
     */
    $scope.stopRecord = function () {
        var msg = {
            id: $scope.clientMsgTypes.STOP_RECORD
        };

        $scope.sendMessage(msg);
    };

    /**
     * Добавление нового пира
     * @param user
     */
    $scope.addNewPeer = function (user) {
        $scope.connectedPeers.push(user);
        $scope.$apply();
    };

    /**
     * Прием сообщения
     * @param msg Строка
     */
    $scope.vars.socket.onmessage = function(msg) {
        var json = JSON.parse(msg.data);

        switch (json['id']) {
            case $scope.serverMsgTypes.COME_IN: {
                    console.log('Вам позволено войти в комнату');
                    $scope.vars.logged = true;

                    // Костыль, без которого перерисовка Angular с какого-то не работает
                    $scope.$apply();

                    createPeer();
                }
                break;
            case $scope.serverMsgTypes.SERVER_ERROR: {
                    console.log('Ошибка сервера');
                } break;
            case $scope.serverMsgTypes.OFFER_ANSWER: {
                    console.log('Основные пиры: ' + JSON.stringify($scope.peersMap));

                    if(json['name'] === $scope.vars.loginName) {
                        // Создание хабового пира
                        if($scope.$$childHead.createHubPeer !== undefined && $scope.$$childHead.hubPeer === undefined) {
                            console.log('Создание хаб-пира');
                            $scope.$$childHead.createHubPeer();
                        } else {
                            if (json['type'] !== undefined && json['type'] === 'recvHub') {
                                console.log('Добавление хаб-кандидата');
                                $scope.$$childHead.hubPeer.processAnswer(json['answer'], function (error) {
                                    if (error) {
                                        return console.error(error);
                                    }
                                });
                                return;
                            } else {
                                if ($scope.$$childHead.createHubPeer === undefined) {
                                    console.log($scope);
                                    return console.error('Не определена функция создания пира');
                                }
                                return;
                            }
                        }

                        console.log('Ответ текущему пользователю' + json['name']);
                        $scope.vars.sendPeer.processAnswer(json['answer'], function (error) {
                            if(error) {
                                console.error(error);
                            }
                        });
                    } else {
                        console.log('Ответ передающему пользователю: ' + json['name']);

                        $scope.peersMap[json['name']].processAnswer(json['answer'], function(error) {
                            if(error) {
                                console.error(error);
                            }
                        });
                    }
                } break;
            case $scope.serverMsgTypes.ICE: {
                    console.log('Пришла метка ICE сервера. Пользователь: ' + json['name']);

                    var candObject = JSON.parse(json['candidate']);

                    if(json['type'] !== undefined && json['type'] === 'recvHub') {
                        $scope.$$childHead.hubPeer.addIceCandidate(candObject, function (error) {
                            if(error) {
                                return console.error('Не удалось добавить ICE сервер: ' + error);
                            }
                        });

                        return;
                    }

                    if(json['name'] === $scope.vars.loginName) {
                        $scope.vars.sendPeer.addIceCandidate(candObject, function (error) {
                            if (error) {
                                return console.error('Не удалось добавить ICE сервер для передающего пира: ' + error);
                            }
                        });
                    } else {
                        if($scope.peersMap[json['name']] !== undefined) {
                            $scope.peersMap[json['name']].addIceCandidate(candObject, function (error) {
                                console.log('Обработан кандидат для принимающего пира...');
                                if(error) {
                                    return console.error('Не удалось добавить ICE сервер для принимающего пира: ' + error);
                                }
                            });
                        } else {
                            return console.error('Нет пира с таким именем');
                        }
                    }
                } break;
            case $scope.serverMsgTypes.EXISTS_LIST: {
                    console.log('Сообщение: ' + JSON.stringify(json))

                    angular.forEach(json['names'], function (name, index) {
                        var existUser = {};
                        existUser['name'] = name;
                        existUser['width'] = 160;
                        existUser['height'] = 120;

                        $scope.addNewPeer(existUser);
                    });
                } break;
            case $scope.serverMsgTypes.NEW_USER: {
                    console.log('В комнату вошел новый пользователь: ' + json['name']);
                } break;
            case $scope.serverMsgTypes.REMOVE_USER: {
                    console.log('Удаление пользователя: ' + json['name']);

                    // Освобождение пира
                    $scope.peersMap[json['name']].dispose();

                    // Удаление узла
                    $scope.connectedPeers = $scope.connectedPeers.filter(function (elem) {
                        return elem.name !== json['name'];
                    });

                    // Перерисовка
                    $scope.$apply();
                } break;
            default:
                console.log('Обработчик сообщения еще не имплементирован');
        }
    };

    // Вызов функций инициализации
    $scope.createDevicesList(function(audios, videos) {
        $scope.audioDevices = audios;

        $scope.audioDevices.push({
            deviceId: 'kdf',
            label: 'Тест'
        });

        $scope.videoDevices = videos;

        initialize();
    });
});
/**
* Директива реализует вьювер аппонента
*/
kclient.directive('peerViewer', function ($templateCache) {
    return {
        restrict: 'E',
        replace: true,
        template: $templateCache.get('./dist/kc-peer-viewer/template.html'),
        scope: true,
        link: function ($scope, element, attrs) {
            $scope.width = parseInt(attrs['width'], 10);
            $scope.height = parseInt(attrs['height'], 10);
            $scope.vid = parseInt(attrs['vid'], 10);

            var userName = attrs['name'];

            $scope.overed = false;
            $scope.maximized = false;

            /**
             * Функция вызывается при наведении мыши на элемент
             */
            $scope.overMouse = function () {
                $scope.overed = true;
            };

            /**
             * Функция вызывается при выходе указателя мыщи за пределы экрана
             */
            $scope.leaveMouse = function() {
                $scope.overed = false;
            };

            $scope.videoElem = element.find('video')[0];

            /**
             * Обработка метки ICE сервера
             */
            var onIceCandidate = function (candidate, wp) {
                console.log("Локальный кандидат: " + JSON.stringify(candidate));

                var message = {
                    id: $scope.clientMsgTypes.ON_ICE,
                    candidate: candidate,
                    name: userName
                };

                $scope.sendMessage(message);
            };

            /**
             * Предложение принять видео
             * @param error Ошибка
             * @param offerSdp Метка SDP
             * @param wp
             */
            var offerToReceiveVideo = function(error, offerSdp, wp){
                if (error) {
                    return console.error(error);
                }

                console.log('Отправка сообщения на прием видео');

                var msg =  {
                    id : $scope.clientMsgTypes.OFFER_TO_RECIEVE,
                    sender : userName,
                    offer : offerSdp
                };

                $scope.sendMessage(msg);
            };

            /**
             * Пир создан
             * @param error
             */
            var peerCreated = function(error) {
                console.log('Пир создан!');
                if(error) {
                    return console.error(error);
                }

                this.generateOffer(offerToReceiveVideo);
            };

            var mediaOpts = {
                audio: true,
                video: {
                    mandatory: {
                        maxWidth: 800,
                        maxHeight: 600,
                        minWidth: 320,
                        minHeight: 240,
                        minFrameRate: 10
                    }
                }
            };

            var options = {
                remoteVideo: $scope.videoElem,
                mediaConstraints: mediaOpts,
                onicecandidate: onIceCandidate
            };

            $scope.peer = new kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, peerCreated);

            $scope.peersMap[userName] = $scope.peer;

            console.log('Пиры: ' + JSON.stringify($scope.peersMap));
        }
    };
});
/**
* Директива реализует контейнер для отображения виджетов вызывающих аппонентов
*/
kclient.directive('callContainer', function ($templateCache) {
    return {
            restrict: 'E',
            replace: true,
            template: $templateCache.get('./dist/kc-call-container/template.html'),
            scope: true,
            link: function ($scope, element, attrs) {
                var video_elem = element.find('#trans')[0];

                var onIceCandidate = function (candidate, w) {
                    console.log("Локальный хаб-кандидат: " + JSON.stringify(candidate));

                    var message = {
                        id: $scope.clientMsgTypes.ON_ICE,
                        candidate: candidate,
                        name: $scope.vars.loginName,
                        type: 'recvHub'
                    };

                    $scope.sendMessage(message);
                };

                $scope.playVideo = function () {
                    console.log('Играем видео!');
                    var msg =  {
                        id : 'playVideo',
                        sender : $scope.vars.loginName,
                        type: 'recvHub'
                    };

                    $scope.sendMessage(msg);
                };

                var offerToReceiveVideo = function(error, offerSdp, wp){
                    if (error) {
                        return console.error(error);
                    }

                    console.log('Отправка сообщения хабом на прием видео');

                    var msg =  {
                        id : $scope.clientMsgTypes.OFFER_TO_RECIEVE,
                        sender : $scope.vars.loginName,
                        type: 'recvHub',
                        offer : offerSdp
                    };

                    $scope.sendMessage(msg);
                };

                var peerCreated = function(error) {
                    console.log('Хаб-пир создан!');
                    if(error) {
                        return console.error(error);
                    }

                    this.generateOffer(offerToReceiveVideo);
                };

                var mediaOpts = {
                    audio: true,
                    video: {
                        mandatory: {
                            maxWidth: 800,
                            maxHeight: 600,
                            minWidth: 320,
                            maxWidth: 240,
                            minFrameRate: 10
                        }
                    }
                };

                var options = {
                    remoteVideo: video_elem,
                    mediaConstraints: mediaOpts,
                    onicecandidate: onIceCandidate
                };

                $scope.createHubPeer = function () {
                    $scope.hubPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, peerCreated);
                };
            }
    };
});