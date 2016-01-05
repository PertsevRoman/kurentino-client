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
        OFFER_ANSWER: 'offerAnswer',
        NEW_USER: 'newParter'
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
            audio: false,
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
            case $scope.serverMsgTypes.NEW_USER: {
                    console.log('В комнату вошел новый пользователь: ' + json['name']);
                } break;
            default:
                console.log('Обработчик сообщения еще не имплементирован');
        }
    };

    // Вызов функции инициализации
    initialize();
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

            $scope.videoElem = element.find('video')[0];

            /**
             * Обработка метки ICE сервера
             */
            var onIceCandidate = function (candidate, wp) {
                console.log("Local candidate" + JSON.stringify(candidate));

                var message = {
                    id: 'onIceCandidate',
                    candidate: candidate,
                    name: name
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
                    return console.error ("sdp offer error");
                }

                console.log('Invoking SDP offer callback function');

                var msg =  { id : "receiveVideoFrom",
                    sender : name,
                    sdpOffer : offerSdp
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

            var options = {
                remoteVideo: $scope.videoElem,
                onicecandidate: onIceCandidate
            };

            $scope.peer = new kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, peerCreated);
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
                $scope.connectedPeers = [];
            }
    };
});