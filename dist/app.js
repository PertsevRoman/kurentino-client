var kclient = angular.module('kurentinoClient', ['templatescache']);
kclient.config(function($logProvider){
    $logProvider.debugEnabled(true);
});
/**
 * Created by joker on 30.12.15.
 */

kclient.controller('mainCtrl', function($scope) {
    $scope.vars = {
        socket: new WebSocket('ws://' + host.location)
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
});
/**
* Директива реализует вьювер аппонента
*/
kclient.directive('peerViewer', function ($templateCache) {
    return {
        restrict: 'E',
        replace: true,
        template: $templateCache.get('./dist/kc-peer-viewer/template.html'),
        scope: {},
        link: function ($scope, element, attrs) {
            $scope.width = parseInt(attrs['width'], 10);
            $scope.height = parseInt(attrs['height'], 10);

            $scope.videoElem = element.find('video')[0];

            
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
            scope: {},
            link: function ($scope, element, attrs) {
                $scope.connectedPeers = [];
                
                $scope.connectedPeers.push({
                    id: 1,
                    width: 400,
                    height: 300
                });

                $scope.connectedPeers.push({
                    id: 2,
                    width: 400,
                    height: 300
                });
            }
    };
});