/**
 * Created by joker on 30.12.15.
 */

kclient.controller('mainCtrl', function($scope) {
    $scope.vars = {
        socket: new WebSocket('ws://' + host.location),
        logged: false
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
    };

    /**
     * Отправка сообщения
     */
    $scope.sendMessage = function () {
        if($scope.socket) {
            var socketData = {
                id: 'login',
                name: $scope.userName,
                room: $scope.roomName
            };
        }
    }
});