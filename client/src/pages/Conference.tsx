import React, {
  useEffect,
  useState,
  useRef,
  MutableRefObject,
  useContext,
} from "react";
import * as mediasoupClient from "mediasoup-client";
import { Link, useHistory, useParams } from "react-router-dom";
import SpikaBroadcastClient, { Participant } from "../lib/SpikaBroadcastClient";
import { types as mediasoupClientTypes } from "mediasoup-client";
import Utils from "../lib/Utils";
import Peer from "../components/Peer";
import ScreenShareView from "../components/ScreenShareView";
import Me from "../components/Me";
import dayjs from "dayjs";
import deviceInfo from "../lib/deviceInfo";


function Conference() {
  let history = useHistory();

  const myVideoElm: MutableRefObject<HTMLVideoElement | null> =
    useRef<HTMLVideoElement>(null);

  const [participants, setParticipants] = useState<Array<Participant>>(null);
  const [consumerRefs, setConsumerRefs] = useState([]);
  const [cameraEnabled, setCameraEnabled] = useState<boolean>(true);
  const [screenShareEnabled, setScreenShareEnabled] = useState<boolean>(false); ''
  const [micEnabled, setMicEnabled] = useState<boolean>(true);
  const [spikabroadcastClient, setSpikabroadcastClient] =
    useState<SpikaBroadcastClient>(null);
  const [webcamProcuder, setWebcamProducer] =
    useState<mediasoupClient.types.Producer>(null);
  const [microphoneProducer, setMicrophoneProducer] =
    useState<mediasoupClient.types.Producer>(null);
  const [screenShareProducer, setScreenshareProducer] =
    useState<mediasoupClient.types.Producer>(null);
  const [log, setLog] = useState<Array<any>>([]);
  const [peerContainerClass, setPeerContainerClass] = useState<string>("type1");
  const [screenShareMode, setScreenShareMode] = useState<boolean>(false);
  let { roomId }: { roomId?: string } = useParams();
  const [openSettings, setOpenSettings] = useState<boolean>(false);
  const [cameras, setCameras] = useState<Array<MediaDeviceInfo>>([]);
  const [microphones, setMicrophones] = useState<Array<MediaDeviceInfo>>([]);
  const [selectedCamera, setSelectedCamera] = useState<MediaDeviceInfo>(null);
  const [selectedMicrophone, setSelectedMicrophone] = useState<MediaDeviceInfo>(null);

  const peerId = localStorage.getItem("peerId")
    ? localStorage.getItem("peerId")
    : Utils.randomStr(8);
  if (!localStorage.getItem("peerId")) localStorage.setItem("peerId", peerId);

  useEffect(() => {
    const spikaBroadcastClientLocal = new SpikaBroadcastClient({
      debug: true,
      host: "mediasouptest.clover.studio",
      port: 4443,
      roomId: roomId,
      peerId: Utils.randomStr(8),
      displayName: "ken",
      avatarUrl: "",
      listener: {
        onStartVideo: (producer) => {
          setWebcamProducer(producer);
        },
        onStartAudio: (producer) => {
          setMicrophoneProducer(producer);
        },
        onParticipantUpdate: (participants) => {
          const participantsAry: Array<Participant> =
            Array.from(participants, ([key, val]) => val);
          setParticipants(participantsAry);
        },
        onMicrophoneStateChanged: (state) => {
          setMicEnabled(state);
        },
        onCameraStateChanged: (state) => {
          setCameraEnabled(state);
        },
        onScreenShareStateChanged: (state) => {
          setScreenShareEnabled(state);
        },
        onStartShare: (producer) => {
          setScreenshareProducer(producer);
        },
        onSpeakerStateChanged: () => { },
        onCallClosed: () => { },
        onUpdateCameraDevice: () => { },
        onUpdateMicrophoneDevice: () => { },
        onUpdateSpeakerDevice: () => { },
        onLogging: (type, message) => {
          if (typeof message !== "string")
            message = `<span class="small">${Utils.printObj(message)}</span>`;
          log.push({ time: dayjs().format("HH:mm"), type, message });
        },
      },
    });

    spikaBroadcastClientLocal.connect();
    setSpikabroadcastClient(spikaBroadcastClientLocal);

    // load cameara and microphones
    (async () => {
      const devices: Array<MediaDeviceInfo> = await navigator.mediaDevices.enumerateDevices();

      const cameras: Array<MediaDeviceInfo> = devices.filter((device: MediaDeviceInfo) => device.kind == "videoinput");
      if (cameras && cameras.length > 0) {
        setCameras(cameras);
        setSelectedCamera(cameras[0]);
      }

      const microphones: Array<MediaDeviceInfo> = devices.filter((device: MediaDeviceInfo) => device.kind == "audioinput");
      if (microphones && microphones.length > 0) {
        setMicrophones(microphones);
        setSelectedMicrophone(microphones[0]);
      }

    })();


  }, []);

  useEffect(() => {
    if (!participants) return;

    const participantCount = participants.length;
    if (participantCount <= 1) setPeerContainerClass("type1");
    else if (participantCount <= 3) setPeerContainerClass("type2");
    else if (participantCount <= 5) setPeerContainerClass("type3");
    else setPeerContainerClass("type4");

    // handle screenshare logic
    const screenShareparticipant: Participant | undefined = participants.find(participant => participant.consumers.find(consumer => consumer.appData.share));
    const newScreenShareMode = screenShareparticipant !== undefined;

    if (screenShareMode !== newScreenShareMode && newScreenShareMode && screenShareEnabled) {
      console.log("going to disable screenshare")
      spikabroadcastClient.toggleScreenShare();
    }

    setScreenShareMode(newScreenShareMode);

  }, [participants]);

  const consumerVideoElmInit = (elm: HTMLVideoElement, i: number) => {
    if (!participants || !participants[i] || !elm) return;

    const participant: Participant = participants[i];

    const consumers = participant.consumers;
    if (!consumers) return;

    const stream = new MediaStream();
    consumers.map((consumer) => stream.addTrack(consumer.track));

    elm.srcObject = stream;
    elm.play().catch((error: Error) => console.log(error));
  };

  const close = async () => {
    await spikabroadcastClient.disconnect();
    history.push(`/`);
  };

  const updateDevice = async () => {

    if (selectedCamera)
      await spikabroadcastClient.updateCamera(selectedCamera);

    if (selectedMicrophone)
      await spikabroadcastClient.updateMicrophone(selectedMicrophone);
  }

  return (
    <div id="spikabroadcast">
      <header></header>
      <main className={`conference-main ${screenShareMode || screenShareEnabled ? "screen-share" : "no-screen-share"}`}>
        <div className={`peers ${peerContainerClass}`}>
          <div className="me">
            <Me
              videoProducer={webcamProcuder}
              audioProducer={microphoneProducer}
            />
          </div>
          <>
            {participants
              ? participants.map((participant, i) => {
                return (
                  <div className="participant">
                    <Peer participant={participant} key={participant.id} />
                  </div>
                );
              })
              : null}
          </>
        </div>
        <>
          {participants
            ? participants.map((participant, i) => {

              if (participant.consumers.find(consumer => {
                return consumer.appData.share
              })) {

                const videoTrackConsumer: mediasoupClient.types.Consumer = participant.consumers.find(consumer => {
                  return consumer.appData.share
                })
                return (
                  <div className="screenshare">
                    <ScreenShareView videoTrack={videoTrackConsumer.track} />
                  </div>
                );
              }
            })
            : null}

          {screenShareEnabled ? <div className="screenshare"><ScreenShareView videoTrack={screenShareProducer.track} /></div> : null}
        </>

        <div className="log">
          {log.map(({ time, type, message }) => {
            return (
              <div className={type}>
                <span className="date">{time}</span>
                <span dangerouslySetInnerHTML={{ __html: message }} />
              </div>
            );
          })}
        </div>
        <div className="controlls">
          <ul>
            <li>
              <a
                className="large_icon"
                onClick={(e) => spikabroadcastClient.toggleCamera()}
              >
                {cameraEnabled ? (
                  <i className="fas fa-video" />
                ) : (
                  <i className="fas fa-video-slash" />
                )}
              </a>
            </li>
            <li>
              <a
                className="large_icon"
                onClick={(e) => spikabroadcastClient.toggleMicrophone()}
              >
                {micEnabled ? (
                  <i className="fas fa-microphone" />
                ) : (
                  <i className="fas fa-microphone-slash" />
                )}
              </a>
            </li>
            <li>
              <a className="large_icon">
                <i className="fas fa-users"></i>
              </a>
            </li>
            <li>
              <a
                className="large_icon"
                onClick={(e) => {
                  if (screenShareMode) {
                    if (confirm("Another use is sharing screen, do you want disable the current share ?"))
                      return spikabroadcastClient.toggleScreenShare();
                  } else {

                  }
                  spikabroadcastClient.toggleScreenShare()
                }
                }
              >
                {!screenShareEnabled ? (
                  <i className="fas fa-desktop" />
                ) : (
                  <i className="fas fa-stop-circle" />
                )}
              </a>
            </li>
            <li>
              <a className="button" onClick={(e) => close()}>
                <i className="fal fa-times red"></i>
              </a>
            </li>
          </ul>
        </div>
      </main>
      <footer></footer>
      <div className="settings-button float-button" onClick={e => setOpenSettings(!openSettings)}>
        <i className="fas fa-bars"></i>
      </div>
      <div className={`settings-view ${openSettings ? "open" : "close"}`}>
        <div className="float-button">
          <i className="fas fa-times" onClick={e => setOpenSettings(false)}></i>
        </div>

        <div>
          <label>Camera</label>
          <select onChange={e => setSelectedCamera(cameras.find(c => c.deviceId === e.target.value))}>
            {cameras.map((device: MediaDeviceInfo) => <option value={device.deviceId}>{device.label}</option>)}
          </select>
        </div>
        <div>
          <label>Microphone</label>
          <select onChange={e => setSelectedMicrophone(microphones.find(c => c.deviceId === e.target.value))}>
            {microphones.map((device: MediaDeviceInfo) => <option value={device.deviceId}>{device.label}</option>)}
          </select>
        </div>
        <div className="button-holder">
          <button onClick={e => { setOpenSettings(false); updateDevice() }}>OK</button>
        </div>
      </div>
    </div >
  );
}

export default Conference;
