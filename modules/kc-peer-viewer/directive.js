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
        }
    };
});