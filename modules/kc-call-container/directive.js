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