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
            audio: this.audio ? {
                mandatory: {
                    sourceId: this.audio
                }
            } : this.audio,
            video: this.video ? {
                mandatory: {
                    sourceId: this.video,
                    maxWidth: 800,
                    maxHeight: 600,
                    minWidth: 160,
                    minHeight: 120,
                    maxFrameRate: 25
                }
            }: this.video
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

                    delete $scope.connectedPeers[json['name']];

                    // Удаление узла
                    //$scope.connectedPeers = $scope.connectedPeers.filter(function (elem) {
                    //    return elem.name !== json['name'];
                    //});

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