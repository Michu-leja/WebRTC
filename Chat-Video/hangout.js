// This library is known as multi-user connectivity wrapper!
// It handles connectivity tasks to make sure two or more users can interconnect!

var hangout = function(config) {
    var self = {
            userToken: uniqueToken(),
            userName: 'Anonymous'
        },
        channels = '--',
        isbroadcaster,
        isbroadcasterS = false,
        isGetNewRoom = true,
        sockets = [],
        defaultSocket = { }, RTCDataChannels = [];

    function openDefaultSocket() {
        defaultSocket = config.openSocket({
            onmessage: onDefaultSocketResponse,
            callback: function(socket) {
                defaultSocket = socket;
            }
        });
    }

    function onDefaultSocketResponse(response) {
        if (response.userToken == self.userToken) return;

        if (isGetNewRoom && response.roomToken && response.broadcaster) {
            config.onRoomFound(response)

        };

        if(response.broadcasterS ){
            config.onScreen(response)
        }

        if (response.newParticipant && self.joinedARoom && self.broadcasterid == response.userToken) onNewParticipant(response.newParticipant);

        if (response.userToken && response.joinUser == self.userToken && response.participant && channels.indexOf(response.userToken) == -1) {
            channels += response.userToken + '--';
            openSubSocket({
                isofferer: true,
                channel: response.channel || response.userToken,
                closeSocket: true
            });
        }

        if (response.left && config.onRoomClosed) {
            config.onRoomClosed(response);
        }

    }


    function openSubSocket(_config) {
        if (!_config.channel) return;
        var socketConfig = {
            channel: _config.channel,
            onmessage: socketResponse,
            onopen: function() {
                if (isofferer && !peer) initPeer();
                sockets[sockets.length] = socket;
            }
        };

        socketConfig.callback = function(_socket) {
            socket = _socket;
            this.onopen();
        };

        var socket = config.openSocket(socketConfig),
            isofferer = _config.isofferer,
            gotstream,
            video = document.createElement('video'),
            video2= document.createElement('video'),
            inner = { },
            peer;


        var peerConfig = {
            attachStream: config.attachStream,
            //attachStreams:config.attachStreams,

            onICE: function(candidate) {
                socket.send({
                    userToken: self.userToken,
                    candidate: {
                        sdpMLineIndex: candidate.sdpMLineIndex,
                        candidate: JSON.stringify(candidate.candidate)
                    }
                });
            },
            onRemoteStream: function(stream) {
                if (!stream) return;

                try {
                    video.setAttributeNode(document.createAttribute('autoplay'));
                    video.setAttributeNode(document.createAttribute('playsinline'));
                    video.setAttributeNode(document.createAttribute('controls'));
                } catch (e) {
                    video.setAttribute('autoplay', true);
                    video.setAttribute('playsinline', true);
                    video.setAttribute('controls', true);
                }

                video.srcObject = stream;

                _config.stream = stream;
                onRemoteStreamStartsFlowing();


            },
            onRemoteStreamEnded: function(stream) {
                if (config.onRemoteStreamEnded)
                    config.onRemoteStreamEnded(stream, video);
            },
            onChannelOpened: onChannelOpened,
            onChannelMessage: function(event) {
                config.onChannelMessage(JSON.parse(event.data));
            },
            //screen sharing
            onscreen: function(screen) {
                //if (self.detectedRoom) return;
                //self.detectedRoom = true;

               self.view(screen);
            },
            onuserleft: function(_userid) {
                if (root.onuserleft) root.onuserleft(_userid);

                if (root.onNumberOfParticipantsChnaged) root.onNumberOfParticipantsChnaged(Object.keys(peers).length);
            },
            onaddstream: function(stream, _userid) {
                console.log('onaddstream', '>>>>>>', stream);
                addStreamStopListener(stream, function() {
                    if (this.onuserleft) this.onuserleft(_userid);
                });

                //var video = document.createElement('video');
                video.id = _userid;

                try {
                    video.setAttributeNode(document.createAttribute('autoplay'));
                    video.setAttributeNode(document.createAttribute('playsinline'));
                    video.setAttributeNode(document.createAttribute('controls'));
                } catch (e) {
                    video.setAttribute('autoplay', true);
                    video.setAttribute('playsinline', true);
                    video.setAttribute('controls', true);
                }

                video2.srcObject = stream;


                afterRemoteStreamStartedFlowingS();
            },
                };

        function afterRemoteStreamStartedFlowingS() {
            console.log('afterremotestreamstartedflowing')
            gotstream = true;

            if (config.onaddstream)
                config.onaddstream({
                    video: video2,
                    stream: _config.stream
                });

            if (isbroadcaster && channels.split('--').length > 3) {
                /* broadcasting newly connected participant for video-conferencing! */
                defaultSocket.send({
                    newParticipant: socket.channel,
                    userToken: self.userToken
                });
            }


           if (onaddstream) return;
            onaddstream({
                video: video,
                stream: stream,
                userid: _userid,
                type: 'remote'
            });
        };


        function initPeer(offerSDP) {
            if (!offerSDP) {
                peerConfig.onOfferSDP = sendsdp;
            } else {
                peerConfig.offerSDP = offerSDP;
                peerConfig.onAnswerSDP = sendsdp;
            }

            peer = RTCPeerConnection(peerConfig);
        }

        function onChannelOpened(channel) {
            RTCDataChannels[RTCDataChannels.length] = channel;
            /*channel.send(JSON.stringify({
                message: 'Hi, I\'m <strong>' + self.userName + '</strong>!',
                sender: self.userName
            }));*/

            if (config.onChannelOpened) config.onChannelOpened(channel);

            if (isbroadcaster && channels.split('--').length > 3) {
                /* broadcasting newly connected participant for video-conferencing! */
                defaultSocket.send({
                    newParticipant: socket.channel,
                    userToken: self.userToken
                });
            }

            gotstream = true;
        }

        function afterRemoteStreamStartedFlowing() {
            gotstream = true;

            if (config.onRemoteStream)
                config.onRemoteStream({
                    video: video,
                    stream: _config.stream
                });

            if (isbroadcaster && channels.split('--').length > 3) {
                /* broadcasting newly connected participant for video-conferencing! */
                defaultSocket.send({
                    newParticipant: socket.channel,
                    userToken: self.userToken
                });
            }
        }

        function onRemoteStreamStartsFlowing() {
            if(navigator.userAgent.match(/Android|iPhone|iPad|iPod|BlackBerry|IEMobile/i)) {
                // if mobile device
                return afterRemoteStreamStartedFlowing();
            }

            if (!(video.readyState <= HTMLMediaElement.HAVE_CURRENT_DATA || video.paused || video.currentTime <= 0)) {
                afterRemoteStreamStartedFlowing();
            } else setTimeout(onRemoteStreamStartsFlowing, 50);
        }

        function sendsdp(sdp) {
            socket.send({
                userToken: self.userToken,
                sdp: JSON.stringify(sdp)
            });
        }

        function socketResponse(response) {
            if (response.userToken == self.userToken) return;

            if (response.sdp) {
                inner.sdp = JSON.parse(response.sdp);
                selfInvoker();
            }

            if (response.candidate && !gotstream) {
                peer && peer.addICE({
                    sdpMLineIndex: response.candidate.sdpMLineIndex,
                    candidate: JSON.parse(response.candidate.candidate)
                });
            }

            if (response.left) {
                if (peer && peer.peer) {
                    peer.peer.close();
                    peer.peer = null;
                }
            }
        }

        var invokedOnce = false;

        function selfInvoker() {
            if (invokedOnce) return;

            invokedOnce = true;

            if (isofferer) peer.addAnswerSDP(inner.sdp);
            else initPeer(inner.sdp);
        }
    }

    function leave() {
        var length = sockets.length;
        for (var i = 0; i < length; i++) {
            var socket = sockets[i];
            if (socket) {
                socket.send({
                    left: true,
                    userToken: self.userToken
                });
                delete sockets[i];
            }

        }
        if (isbroadcaster) {
            defaultSocket.send({
                left: true,
                userToken: self.userToken,
                roomToken: self.roomToken
            });
        }
        for(i=0;i<config.attachStream.length;i++){
        if (config.attachStream[i]) {
            if('stop' in config.attachStream) {
                config.attachStream.stop();
            }
            else {
                config.attachStream.getTracks().forEach(function(track) {
                    track.stop();
                });
            }
        }}
    }

    window.onbeforeunload = function() {
        leave();
    };

    window.onkeyup = function(e) {
        if (e.keyCode == 116) leave();
    };

    function startBroadcasting() {
        defaultSocket && defaultSocket.send({
            roomToken: self.roomToken,
            roomName: self.roomName,
            broadcaster: self.userToken,
            userName:self.userName
        });
        setTimeout(startBroadcasting, 3000);
    }

    function onNewParticipant(channel) {
        if (!channel || channels.indexOf(channel) != -1 || channel == self.userToken) return;
        channels += channel + '--';

        var new_channel = uniqueToken();
        openSubSocket({
            channel: new_channel,
            closeSocket: true
        });

        defaultSocket.send({
            participant: true,
            userToken: self.userToken,
            joinUser: channel,
            channel: new_channel
        });
    }

    function uniqueToken() {
        var s4 = function() {
            return Math.floor(Math.random() * 0x10000).toString(16);
        };
        return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
    }

    //funciones sharescreen


   function  broadcast () {
       console.log('EN BROADCAST DE SCREEN')
       defaultSocket && defaultSocket.send({
           roomToken: self.roomToken,
           roomName: self.roomName,
           broadcasterS: true,
           idBoton: 'michellin',
           userName:self.userName
       });
       setTimeout(broadcast, 3000);};


    openDefaultSocket();
    return {
        createRoom: function(_config) {
            self.roomName = _config.roomName || 'Anonymous';
            self.roomToken = uniqueToken();
            if (_config.userName) self.userName = _config.userName;

            isbroadcaster = true;
            isGetNewRoom = false;
            startBroadcasting();

        },
        joinRoom: function(_config) {
            self.roomToken = _config.roomToken;
            if (_config.userName) self.userName = _config.userName;
            isGetNewRoom = false;

            self.joinedARoom = true;
            self.broadcasterid = _config.joinUser;

            openSubSocket({
                channel: self.userToken
            });

            defaultSocket.send({
                participant: true,
                userToken: self.userToken,
                joinUser: _config.joinUser
            });
        },
        send: function(message) {
            var length = RTCDataChannels.length,
                data = JSON.stringify({
                    message: message,
                    sender: self.userName
                });
            if (!length) return;
            for (var i = 0; i < length; i++) {
                if (RTCDataChannels[i].readyState == 'open') {
                    RTCDataChannels[i].send(data);
                }
            }
        },
        //screen S
        share: function  (_config) {

            console.log('estoy en share');
           // self.roomid=roomid;
            isbroadcasterS=true;
                //openSubSocket(channels);
                broadcast();

        },
        join : function(_config) {
            console.log('join videoconference')
            self.roomToken = _config.roomToken;
            if (_config.userName) self.userName = _config.userName;
            isGetNewRoom = false;

            self.joinedARoomS = true;
           // self.broadcasterid = _config.joinUser;

            openSubSocket({
                channel: self.userToken
            });

            defaultSocket.send({
                participant: true,
                userToken: self.userToken,
                joinUser: _config.joinUser
            });
                    },
        view:function(room) {
        openSubSocket({channel: self.userToken});

        this.join({
            roomToken: room.roomToken,
            roomid: room.roomid
        });
    }

    };
};