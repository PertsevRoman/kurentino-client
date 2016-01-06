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
            var userName = attrs['name'];

            $scope.videoElem = element.find('video')[0];

            /**
             * Обработка метки ICE сервера
             */
            var onIceCandidate = function (candidate, wp) {
                console.log("Локальный кандидат: " + JSON.stringify(candidate));

                var message = {
                    id: $scope.clientMsgTypes.ON_ICE,
                    candidate: candidate,
                    name: userName
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
                    return console.error(error);
                }

                console.log('Отправка сообщения на прием видео');

                var msg =  {
                    id : $scope.clientMsgTypes.OFFER_TO_RECIEVE,
                    sender : userName,
                    offer : offerSdp
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

            $scope.peersMap[userName] = $scope.peer;

            console.log('Пиры: ' + JSON.stringify($scope.peersMap));
        }
    };
});