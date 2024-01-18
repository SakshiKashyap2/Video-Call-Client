import React, {createContext, useState, useRef, useEffect} from 'react';
import {io} from 'socket.io-client';

import Peer from 'simple-peer';
import config from './config';


const SocketContext=createContext();

const socket=io(config.SERVER);
// const socket=io('https://warm-wildwood-81069.herokuapp.com');


const ContextProvider = ({children})=>{

    const [me, setMe]=useState('');
    
    const [stream, setStream]=useState();
    const [call, setCall]=useState({});
    const [callAccepted, setCallAccepted]=useState(false);
    const [callEnded, setCallEnded]=useState(false);
    const [name, setName]=useState('');

    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();


    // Asking for camera permission on page load
    useEffect(()=>{

        navigator.mediaDevices.getUserMedia({video: true, audio: true})
            .then(async (currentStream)=>{
                
                setStream(currentStream);
                
                try{
                    myVideo.current.srcObject = currentStream;
                    
                    // console.log(currentStream);
                }catch(err){
                    console.log(err);
                }
            });
        
        socket.on('me', (id)=>{
            setMe(id);
        });
        socket.on('callUser', ({from, name: callerName, signal})=>{
            setCall({isReceivedCall: true, from, name: callerName, signal});
        })
    }, []);


    const answerCall =()=>{
        setCallAccepted(true);
        const peer = new Peer({initiator: false, trickle: false, stream});

        peer.on('signal', (data)=>{
            socket.emit('answerCall', {signal: data, to: call.from});
        })

        peer.on('stream', (currentStream)=>{
            userVideo.current.srcObject=currentStream;
            console.log(userVideo);
        });

        peer.signal(call.signal);
        connectionRef.current=peer;
    }

    const callUser=(id)=>{
        const peer = new Peer({initiator: true, trickle: false, stream});

        peer.on('signal', (data)=>{
            socket.emit('callUser', {userToCall: id, signalData: data, from: me, name});
        })

        peer.on('stream', (currentStream)=>{
            userVideo.current.srcObject=currentStream;
        });

        socket.on('callAccepted', (signal)=>{
            setCallAccepted(true);
            peer.signal(signal);

        });
        connectionRef.current=peer;

    }

    const leaveCall= ()=>{

        setCallEnded(true);


        connectionRef.current.destroy();
        window.location.reload();
    }

    //Values returning here will be accessible globally and can be accessed anywhere in the components
    return(
        <SocketContext.Provider value={{ call, callAccepted, myVideo, userVideo,stream, name,  setName, callEnded, me, callUser, leaveCall, answerCall}}>
            {children}
        </SocketContext.Provider>
    )
}


export {ContextProvider, SocketContext}