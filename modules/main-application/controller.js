/**
 * Created by joker on 30.12.15.
 */

kclient.controller('mainCtrl', function($scope) {
    // Переменные
    $scope.vars = {
        socket: new WebSocket('ws://' + host.location),
        logged: false
    };

    // Типы сообщений
    $scope.msgTypes = {
        LOGIN: 'login',
        LOGOUT: 'logout'
    };

    // Типы принимающих сообщений
    $scope.responseTypes = {
        COME_IN: 'comein'
    };

    /**
     * Функция инициализации соединения с сервером
     */
    var initialize = function () {
        // Отключение события WindowBeforeUnload
        $scope.on('$destroy', function () {
            window.onbeforeunload = undefined;
        });

        // Событие смены локации
        $scope.on('$locationChangeStart', function (event, next, current) {
            if(confirm('Вы действительно хотите уйти со страницы?')) {
                $scope.vars.socket.close();
                event.preventDefault();
            }
        });
    };


    /**
     * Логин
     */
    $scope.login = function () {
        var data = {
            id: $scope.LOGIN,
            name: $scope.loginName,
            room: $scope.roomName
        }

        $scope.sendMessage(data);
    };

    /**
     * Отправка сообщения
     * @param msg JSON
     */
    $scope.sendMessage = function (msg) {
        var strMsg = JSON.stringify(msg);
        $scope.vars.socket.send(strMsg);
    }
});