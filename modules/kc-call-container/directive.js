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
                var video_elem = element.find('#trans')[0];

                var onIceCandidate = function (candidate, w) {
                    console.log("Локальный хаб-кандидат: " + JSON.stringify(candidate));

                    var message = {
                        id: $scope.clientMsgTypes.ON_ICE,
                        candidate: candidate,
                        name: $scope.vars.loginName,
                        type: 'recvHub'
                    };

                    $scope.sendMessage(message);
                };

                $scope.playVideo = function () {
                    console.log('Играем видео!');
                    var msg =  {
                        id : 'playVideo',
                        sender : $scope.vars.loginName,
                        type: 'recvHub'
                    };

                    $scope.sendMessage(msg);
                };

                var offerToReceiveVideo = function(error, offerSdp, wp){
                    if (error) {
                        return console.error(error);
                    }

                    console.log('Отправка сообщения хабом на прием видео');

                    var msg =  {
                        id : $scope.clientMsgTypes.OFFER_TO_RECIEVE,
                        sender : $scope.vars.loginName,
                        type: 'recvHub',
                        offer : offerSdp
                    };

                    $scope.sendMessage(msg);
                };

                var peerCreated = function(error) {
                    console.log('Хаб-пир создан!');
                    if(error) {
                        return console.error(error);
                    }

                    this.generateOffer(offerToReceiveVideo);
                };

                var mediaOpts = {
                    audio: true,
                    video: {
                        mandatory: {
                            maxWidth: 800,
                            maxHeight: 600,
                            minWidth: 320,
                            maxWidth: 240,
                            minFrameRate: 10
                        }
                    }
                };

                var options = {
                    remoteVideo: video_elem,
                    mediaConstraints: mediaOpts,
                    onicecandidate: onIceCandidate
                };

                $scope.createHubPeer = function () {
                    $scope.hubPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, peerCreated);
                };
            }
    };
});