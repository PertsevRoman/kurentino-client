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
            }
    };
});