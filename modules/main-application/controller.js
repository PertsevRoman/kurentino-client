/**
 * Created by joker on 30.12.15.
 */

kclient.controller('mainCtrl', function($scope) {
    // Переменные
    $scope.vars = {
        socket: new WebSocket('wss://' + location.host + ':8025'),
        logged: false,
        sendPeer: null,
        currentAudioDevice: '',
        currentVideoDevice: ''
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

    $scope.$watch('vars.currentAudioDevice', function (val) {
        console.log('Видео: ' + val);
    });

    $scope.$watch('vars.currentVideoDevice', function (val) {
        console.log('Аудио: ' + val);
    });

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
                    sourceId: 'ddca89f146312b2a80911aac6f3456be80e2c98323bbd93d06ea9faef17c506a'
                }
            },
            video: {
                mandatory: {
                    sourceId: 'c1471a8b2425a80883c978ca3d74606e4206a220ef92759f0771c9ddd234e10c',
                    maxWidth: 800,
                    maxHeight: 600,
                    minWidth: 160,
                    minHeight: 320,
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

                    $scope.vars.sendPeer.addIceCandidate(candObject, function (error) {
                        if(error) {
                            return console.error('Не удалось добавить ICE сервер: ' + error);
                        }
                    });
                } break;
            case $scope.serverMsgTypes.EXISTS_LIST: {
                    console.log('Сообщение: ' + JSON.stringify(json))

                    angular.forEach(json['names'], function (name, index) {
                        var existUser = {};
                        existUser['name'] = name;
                        existUser['width'] = 320;
                        existUser['height'] = 240;

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
        $scope.videoDevices = videos;

        initialize();
    });
});