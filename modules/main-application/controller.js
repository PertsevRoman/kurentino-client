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
        // Отключение события WindowBeforeUnload
        $scope.$on('$destroy', function () {
            window.onbeforeunload = undefined;
        });

        // Событие смены локации
        $scope.$on('$locationChangeStart', function (event, next, current) {
            if(confirm('Вы действительно хотите уйти со страницы?')) {
                $scope.vars.socket.close();
                event.preventDefault();
            }
        });

        $scope.vars.loginName = randWDclassic(9);
        $scope.vars.roomName = 'Тест';
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
            audio: true,
            video: {
                mandatory: {
                    maxWidth: 320,
                    maxHeight: 240,
                    minFrameRate: 15
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

    // Вызов функции инициализации
    initialize();
});