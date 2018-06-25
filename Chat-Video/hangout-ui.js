/*
* Funciones para videoconferencia
* openSocket: Abre el socket correspondiente, connectandose al servidor de señalización
* onRemoteStream: Obtiene el video del par remoto
* onRemoteStreamEnded: Remueve el video, si se termina la transmisión del peer remoto
* OnRoomFound: En caso de que el par remoto encuentre un cuarto ya creado, se genera el botón Join para unirse a la videoconferencia
    -joinRoom, es llamado para unir al peer remoto al cuarto
    -CaptureUserMedia: obtiene el MediaStream del peer remoto.
*Funciones para ScreenSharing
* onScreen: Si ya existe un cuarto compartiendo pantalla, se crea un boton View para unirse a la transmisión
* onAddStream: Obtiene el video screensharing del par remoto
* onuserleft: Remueve el video si se termina la transmisión del par remoto
*onRoomClosed:
* onNumberOfParticipantsChanged: Indica el numero de participantes que ven la pantalla
* CHAT:
* onChannelMessage: crea los espacios para insertar el texto
* */

//Variable de configuración
var config = {
    openSocket: function(config) {
        var SIGNALING_SERVER = 'https://172.29.88.174:4444/';

        config.channel = config.channel || location.href.replace(/\/|:|#|%|\.|\[|\]/g, '');
        var sender = Math.round(Math.random() * 999999999) + 999999999;

        //.connect: conectarse al servidor de señalización
        //.emit recibe como argumentos nombredel evento: 'new-channel' y argumentos de configuracion de canal y url
        io.connect(SIGNALING_SERVER).emit('new-channel', {
            channel: config.channel,
            sender: sender
        });

        var socket = io.connect(SIGNALING_SERVER + config.channel);
        socket.channel = config.channel;
        //evento connect
        socket.on('connect', function() {
            if (config.callback) config.callback(socket);
        });

        socket.send = function(message) {
            socket.emit('message', {
                sender: sender,
                data: message
            });
        };
//.on : nuevo controlador para un evento dado
        socket.on('message', config.onmessage);
    },
    onRemoteStream: function(media) {
        var mediaElement = getMediaElement(media.video, {
            width: (videosContainer.clientWidth / 2) - 50,
            buttons: ['mute-audio', 'mute-video', 'full-screen', 'volume-slider']
        });
        //getTracks: obtiene todos los mediaStreamTrack de un objeto MediaStream
        mediaElement.id = media.stream.getTracks();
        //añade el video (tracks a el videoContainer)
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

    // /ScreenSharing
    onScreen:function(_screen) {
        var alreadyExist = document.getElementById(_screen.idBoton);
        if (alreadyExist) return;
        if (typeof roomListScreen === 'undefined') roomListScreen = document.body;
        var tr = document.createElement('tr');

        tr.id = _screen.idBoton;
        tr.innerHTML = '<td>' + _screen.userName + ' shared his screen.</td>' +
            '<td><button class="joinS">View</button></td>';
        roomListScreen.insertBefore(tr, roomListScreen.firstChild);
        share_screen.visible=false;
        var button = tr.querySelector('.joinS');
        button.setAttribute('data-userid', _screen.userName);
        button.setAttribute('data-roomid', _screen.roomName);

        button.onclick = function() {
            var button = this;
            button.disabled = true;

            var _screen = {
                userName: button.getAttribute('data-userid'),
                roomName: button.getAttribute('data-roomid')
            };
            /*
                hangoutUI.join({
                    roomToken: tr.querySelector('.joinS').id,
                    joinUser: tr.id,
                    userName: username
                });*/
            //para poder visualizar la pantalla
            hangoutUI.view(_screen);

        };
    },
    onaddstream : function(media) {
        console.log('on addstream screen sh');
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
    onuserleft : function(userid) {
        var video = document.getElementById(userid);
        if (video && video.parentNode) video.parentNode.removeChild(video);

        location.reload();
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
    onNumberOfParticipantsChanged : function(numberOfParticipants) {
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
    //CHAT
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


//screen sharing
var username;
var roomname;


//CAPTURE USER MEDIA
//CaptureUserMedia para compartición de pantalla
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
        //obtener pantalla local
        navigator.mediaDevices.getUserMedia(screen_constraints).then(function(stream) {
            addStreamStopListener(stream, function() {
                if (self.onuserleft) self.onuserleft('self');
            });
            self.stream = stream;
            //crear el elemento video para la comparticion de la pantalla

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
            var constraints = {
                audio: false,
                video: screen_constraints
            };


            video.srcObject = stream;
            console.log('en getusermediaM');
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

//CaptureUserMedia para videoconferencia
function captureUserMedia(callback, failure_callback) {
    //Crear elemento video para videoconferencia

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
        //Para agregar el video al peer antes de transmitirlo
    getUserMedia({
        video: video,
        onsuccess: function(stream) {
            console.log('onsuccess '+stream);

            config.attachStream=stream;

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


//Variables específicas
//hangoutUI= multiple conexión
//videosContainer=contenedor para videoconferencia
//VideosContainerS= contenedor para compartición
//roomList= para añadir botones de join
//room-listScreen= para añadir botón view screensh
//chatOutput= tabla para el chat
//

var hangoutUI = hangout(config);
var videosContainer = document.getElementById('videos-container') || document.body;
var videosContainerS=document.getElementById('videos-container2');
var startConferencing = document.getElementById('start-conferencing');
var roomsList = document.getElementById('rooms-list');
var roomListScreen=document.getElementById('rooms-listScreen');
var chatOutput = document.getElementById('chat-output');
var share_screen=document.getElementById('share-screen');
var chatMessage = document.getElementById('chat-message');


//MANEJADORES DE BOTONES
//share-screen: manejador del botón share-screen para compartición de pantalla
//video-conferencing: Manejador del evento para crear cuarto de videoconferencia y chat

$(document).ready(function () {
    $("#share-screen").click(function () {

        var username=username;
        hangoutUI.isModerator=true;
        /*hangoutUI.createRoom({
        userName:username,
            roomName: roomname}

    )*/
        captureUserMediaS(function() {
            hangoutUI.share();});
    });


});
$(document).ready(function () {
    $("#start-conferencing").click(function () {
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
    });
});
$(document).ready(function () {
    $("#chat-message").change(function () {
        hangoutUI.send(this.value);
        var tr = document.createElement('tr');
        tr.innerHTML =
            '<td style="width:40%;">You:</td>' +
            '<td>' + chatMessage.value + '</td>';

        chatOutput.insertBefore(tr, chatOutput.firstChild);
        chatMessage.value = '';



    })
});
/*
document.getElementById('share-screen').onclick = function() {

    var username=username;
    hangoutUI.isModerator=true;
    /*hangoutUI.createRoom({
    userName:username,
        roomName: roomname}

)
    captureUserMediaS(function() {
    hangoutUI.share();});

};*/
/*function createButtonClickHandler() {

username=prompt('Enter your name', 'Anonymous');
roomname= (document.getElementById('conference-name') || { }).value || 'Anonymous',
    captureUserMedia(function () {
        hangoutUI.createRoom({
            userName:username,
            roomName: (document.getElementById('conference-name') || { }).value || 'Anonymous',

        });
        hideUnnecessaryStuff();


    })

//share_screen.disabled=false;
}*/
/*if (chatMessage)
    chatMessage.onchange = function() {
        hangoutUI.send(this.value);
        var tr = document.createElement('tr');
        tr.innerHTML =
            '<td style="width:40%;">You:</td>' +
            '<td>' + chatMessage.value + '</td>';

        chatOutput.insertBefore(tr, chatOutput.firstChild);
        chatMessage.value = '';
    };*/




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