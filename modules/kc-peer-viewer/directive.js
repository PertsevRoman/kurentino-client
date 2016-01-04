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