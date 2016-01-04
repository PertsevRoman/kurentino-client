/**
 * Created by joker on 30.12.15.
 */

kclient.controller('mainCtrl', function($scope) {
    // Переменные
    $scope.vars = {
        socket: new WebSocket('wss://localhost' + ':8025'),
        logged: false,
        sendPeer: null
    };

    // Типы отправляемых сообщений
    $scope.clientMsgTypes = {
        LOGIN: 'login',
        LOGOUT: 'logout',
        CLIENT_ERROR: 'error',
        OFFER: 'offerVideo',
        START_RECORD: 'startRec',
        STOP_RECORD: 'stopRec',
        ON_ICE: 'onIceCandidate'
    };

    // Типы принимаемых сообщений
    $scope.serverMsgTypes = {
        COME_IN: 'comein',
        SERVER_ERROR: 'error',
        ICE: 'iceCandidate',
        OFFER_ANSWER: 'offerAnswer'
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

        $scope.vars.loginName = 'Роман';
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
                    minFrameRate: 15
                }
            }
        };

        var vid = $('#vid')[0];

        var options = {
            localVideo: vid,
            mediaConstraints: mediaOpts,
            onicecandidate: function (candidate, wp) {
                console.log('Кандидат со стороны клиента');
                console.log(candidate);

                var message = {
                    id: $scope.clientMsgTypes.ON_ICE,
                    candidate: candidate
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
            case $scope.serverMsgTypes.SERVER_ERROR:
                console.log('Ошибка сервера');
                break;
            case $scope.serverMsgTypes.OFFER_ANSWER: {
                    console.log('Пользователю пришел ответ');
                    $scope.vars.sendPeer.processAnswer(json['answer'], function (error) {
                        if(error) {
                            console.error(error);
                        }
                    });
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
            default:
                console.log('Обработчик сообщения еще не имплементирован');
        }
    };

    // Вызов функции инициализации
    initialize();
});