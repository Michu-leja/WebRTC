var config = {
    openSocket: function(config) {
        var SIGNALING_SERVER = 'https:192.168.1.88:4444/';

        config.channel = config.channel || location.href.replace(/\/|:|#|%|\.|\[|\]/g, '');
        var sender = Math.round(Math.random() * 999999999) + 999999999;

        io.connect(SIGNALING_SERVER).emit('new-channel', {
            channel: config.channel,
            sender: sender
        });

        var socket = io.connect(SIGNALING_SERVER + config.channel);
        socket.channel = config.channel;
        socket.on('connect', function() {
            if (config.callback) config.callback(socket);
        });

        socket.send = function(message) {
            socket.emit('message', {
                sender: sender,
                data: message
            });
        };

        socket.on('message', config.onmessage);
    },
    onRemoteStream: function(media) {
        var mediaElement = getMediaElement(media.video, {
            width: (videosContainer.clientWidth / 2) - 50,
            buttons: ['mute-audio', 'mute-video', 'full-screen', 'volume-slider']
        });
        mediaElement.id = media.stream.getTracks();
        videosContainer.appendChild(mediaElement);

    },
    onRemoteStreamEnded: function(stream, video) {
        if (video.parentNode && video.parentNode.parentNode && video.parentNode.parentNode.parentNode) {
            video.parentNode.parentNode.parentNode.removeChild(video.parentNode.parentNode);
        }
    },
    onRoomFound: function(room) {
        var alreadyExist = document.getElementById(room.broadcaster);
        if (alreadyExist) return;

        if (typeof roomsList === 'undefined') roomsList = document.body;

        var tr = document.createElement('tr');
        tr.setAttribute('id', room.broadcaster);
        tr.innerHTML = '<td>' + room.roomName + '</td>' +
            '<td><button class="join" id="' + room.roomToken + '">Join</button></td>';

        roomsList.insertBefore(tr, roomsList.firstChild);

        tr.onclick = function() {
            tr = this;
            captureUserMedia(function() {
            hangoutUI.joinRoom({
                roomToken: tr.querySelector('.join').id,
                joinUser: tr.id,
                userName: prompt('Enter your name', 'Anonymous')
            })});



            hideUnnecessaryStuff();
                    };



        },
//Onscreen para screenSharing
    onScreen:function(_screen) {

        var alreadyExist = document.getElementById(_screen.userid);
        if (alreadyExist) return;

        if (typeof roomListScreen === 'undefined') roomListScreen = document.body;

        var tr = document.createElement('tr');

        tr.id = _screen.userid;
        tr.innerHTML = '<td>' + username + ' shared his screen.</td>' +
            '<td><button class="join">View</button></td>';
        roomListScreen.insertBefore(tr, roomListScreen.firstChild);
        share_screen.visible=false;
        var button = tr.querySelector('.join');
        button.setAttribute('data-userid', _screen.userid);
        button.setAttribute('data-roomid', _screen.roomid);

        button.onclick = function() {
            var button = this;
            button.disabled = true;

            var _screen = {
                userid: button.getAttribute('data-userid'),
                roomid: button.getAttribute('data-roomid')
            };

                hangoutUI.join({
                    roomToken: tr.querySelector('.join').id,
                    joinUser: tr.id,
                    userName: username
                });
            //aun no se sabe
            hangoutUI.view(_screen);
        };
    },
//ONADDSTREAM
    onaddstream : function(media) {
        media.video.id = media.userid;

        var video = media.video;
        videosContainerS.insertBefore(video, videosContainerS.firstChild);
        rotateVideo(video);

        var hideAfterJoin = document.querySelectorAll('.hide-after-join');
        for(var i = 0; i < hideAfterJoin.length; i++) {
            hideAfterJoin[i].style.display = 'none';
        }

        if(media.type === 'local') {
            addStreamStopListener(media.stream, function() {
                location.reload();
            });
        }
    },
//fin de onaddstream
//Onuserleft
    onuserleft : function(userid) {
        var video = document.getElementById(userid);
        if (video && video.parentNode) video.parentNode.removeChild(video);

        // location.reload();
    },


onRoomClosed: function(room) {
        var joinButton = document.querySelector('button[data-roomToken="' + room.roomToken + '"]');
        if (joinButton) {
            // joinButton.parentNode === <li>
            // joinButton.parentNode.parentNode === <td>
            // joinButton.parentNode.parentNode.parentNode === <tr>
            // joinButton.parentNode.parentNode.parentNode.parentNode === <table>
            joinButton.parentNode.parentNode.parentNode.parentNode.removeChild(joinButton.parentNode.parentNode.parentNode);
        }

    },

    onNumberOfParticipantsChnaged : function(numberOfParticipants) {
        if(!screensharing.isModerator) return;

        document.title = numberOfParticipants + ' users are viewing your screen!';
        var element = document.getElementById('number-of-participants');
        if (element) {
            element.innerHTML = numberOfParticipants + ' users are viewing your screen!';
        }
    },

    onReady: function() {
        console.log('now you can open or join rooms');
    },
    onChannelOpened: function(/* channel */) {
        hideUnnecessaryStuff();
    },
    onChannelMessage: function(data) {
        if (!chatOutput) return;

        var tr = document.createElement('tr');
        tr.innerHTML =
            '<td style="width:40%;">' + data.sender + '</td>' +
            '<td>' + data.message + '</td>';

        chatOutput.insertBefore(tr, chatOutput.firstChild);
    },




};
document.getElementById('share-screen').onclick = function() {

var username=username;
hangoutUI.isModerator=true;
hangoutUI.userid=username;
hangoutUI.createRoom({
    userName:username,
        roomName: roomname}

)
    captureUserMediaS(function() {
    hangoutUI.share();});

};

//screen sharing
var username;
var roomname;
function createButtonClickHandler() {

username=prompt('Enter your name', 'Anonymous');
roomname= (document.getElementById('conference-name') || { }).value || 'Anonymous',
    captureUserMedia(function () {
        hangoutUI.createRoom({
            userName:username,
            roomName: (document.getElementById('conference-name') || { }).value || 'Anonymous',

        });
        hideUnnecessaryStuff();


    })

share_screen.disabled=false;
}

function captureUserMediaS(callback, extensionAvailable) {

    getScreenId(function(error, sourceId, screen_constraints) {
        if (IsAndroidChrome) {
            screen_constraints = {
                mandatory: {
                    chromeMediaSource: 'screen'
                },
                optional: []
            };

            screen_constraints = {
                video: screen_constraints
            };

            error = null;
        }

        console.log('screen_constraints', JSON.stringify(screen_constraints, null, '\t'));
        navigator.mediaDevices.getUserMedia(screen_constraints).then(function(stream) {
            addStreamStopListener(stream, function() {
                if (self.onuserleft) self.onuserleft('self');
            });

            self.stream = stream;

            var video = document.createElement('video');
            video.id = 'self';
            video.muted = true;
            video.volume = 0;

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
            console.log('en getusermediaM')
            config.onaddstream({
                video: video,
                stream: stream,
                userid: 'self',
                type: 'local'
            });

            callback(stream);
        }).catch(function(error) {
            if (adapter.browserDetails.browser === 'chrome') {
                alert('Screen capturing is either denied or not supported. Please install chrome extension for screen capturing or run chrome with command-line flag: --enable-usermedia-screen-capturing');
            }else if (adapter.browserDetails.browser === 'chrome' && location.protocol === 'http:') {
                alert('HTTPs is required.');
            }


            console.error(error);
        });
    }, true);
}


function captureUserMedia(callback, failure_callback) {
    var video = document.createElement('video');
    video.muted = true;
    video.volume = 0;

    try {
        video.setAttributeNode(document.createAttribute('autoplay'));
        video.setAttributeNode(document.createAttribute('playsinline'));
        video.setAttributeNode(document.createAttribute('controls'));
    } catch (e) {
        video.setAttribute('autoplay', true);
        video.setAttribute('playsinline', true);
        video.setAttribute('controls', true);
    }

    getUserMedia({
        video: video,
        onsuccess: function(stream) {
            console.log('onsuccess '+stream);
            config.attachStream = stream;

            var mediaElement = getMediaElement(video, {
                width: (videosContainer.clientWidth / 2) - 50,
                buttons: ['mute-audio', 'mute-video', 'full-screen', 'volume-slider']
            });
            mediaElement.toggle('mute-audio');
            videosContainer.appendChild(mediaElement);

            callback && callback();
        },
        onerror: function() {
            alert('unable to get access to your webcam');
            callback && callback();
        }
    });
}

/* on page load: get public rooms */

var hangoutUI = hangout(config);

/* UI specific */
var videosContainer = document.getElementById('videos-container') || document.body;
var videosContainerS=document.getElementById('videos-container2')
var startConferencing = document.getElementById('start-conferencing');
if (startConferencing) startConferencing.onclick = createButtonClickHandler;
var roomsList = document.getElementById('rooms-list');
var roomListScreen=document.getElementById('rooms-listScreen');
var chatOutput = document.getElementById('chat-output');
var share_screen=document.getElementById('share-screen');

function hideUnnecessaryStuff() {
    var visibleElements = document.getElementsByClassName('visible'),
        length = visibleElements.length;

    for (var i = 0; i < length; i++) {
        visibleElements[i].style.display = 'none';
    }

    var chatTable = document.getElementById('chat-table');
    if (chatTable) chatTable.style.display = 'block';
    if (chatOutput) chatOutput.style.display = 'block';
    if (chatMessage) chatMessage.disabled = false;
}

var chatMessage = document.getElementById('chat-message');
if (chatMessage)
    chatMessage.onchange = function() {
        hangoutUI.send(this.value);
        var tr = document.createElement('tr');
        tr.innerHTML =
            '<td style="width:40%;">You:</td>' +
            '<td>' + chatMessage.value + '</td>';

        chatOutput.insertBefore(tr, chatOutput.firstChild);
        chatMessage.value = '';
    };

function rotateVideo(video) {
    video.style[navigator.mozGetUserMedia ? 'transform' : '-webkit-transform'] = 'rotate(0deg)';
    setTimeout(function() {
        video.style[navigator.mozGetUserMedia ? 'transform' : '-webkit-transform'] = 'rotate(360deg)';
    }, 1000);
}

(function() {
    var uniqueToken = document.getElementById('unique-token');
    if (uniqueToken)
        if (location.hash.length > 2) uniqueToken.parentNode.parentNode.parentNode.innerHTML = '<h2 style="text-align:center;"><a href="' + location.href + '" target="_blank">Share this link</a></h2>';
        else uniqueToken.innerHTML = uniqueToken.parentNode.parentNode.href = '#' + (Math.random() * new Date().getTime()).toString(36).toUpperCase().replace( /\./g , '-');
})();
function scaleVideos() {
    var videos = document.querySelectorAll('video'),
        length = videos.length, video;

    var minus = 130;
    var windowHeight = 700;
    var windowWidth = 600;
    var windowAspectRatio = windowWidth / windowHeight;
    var videoAspectRatio = 4 / 3;
    var blockAspectRatio;
    var tempVideoWidth = 0;
    var maxVideoWidth = 0;

    for (var i = length; i > 0; i--) {
        blockAspectRatio = i * videoAspectRatio / Math.ceil(length / i);
        if (blockAspectRatio <= windowAspectRatio) {
            tempVideoWidth = videoAspectRatio * windowHeight / Math.ceil(length / i);
        } else {
            tempVideoWidth = windowWidth / i;
        }
        if (tempVideoWidth > maxVideoWidth)
            maxVideoWidth = tempVideoWidth;
    }
    for (var i = 0; i < length; i++) {
        video = videos[i];
        if (video)
            video.width = maxVideoWidth - minus;
    }
}

window.onresize = scaleVideos;