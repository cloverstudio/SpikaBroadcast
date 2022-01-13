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

import SettingModal from "../components/Modal";
import deviceInfo from "../lib/deviceInfo";
import iconCamera from "../../../assets/img/camera.svg";
import iconMic from "../../../assets/img/mic.svg";
import iconCameraOff from "../../../assets/img/cameraoff.svg";
import iconMicOff from "../../../assets/img/micoff.svg";
import iconExit from "../../../assets/img/exit.svg";
import iconScreenShare from "../../../assets/img/screenshare.svg";
import iconScreenShareOff from "../../../assets/img/screenshareoff.svg";
import iconUsers from "../../../assets/img/users.svg";
import iconSettingArrow from "../../../assets/img/settingarrow.svg";

interface ModalState {
  showVideo: boolean;
  showMicrophone: boolean;
  showName: boolean;
}

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
  const [displayName, setDisplayName] = useState<string>(localStorage.getItem("username") || "No name");
  const [tmpDisplayName, setTmpDisplayName] = useState<string>(localStorage.getItem("username") || "No name");
  const [editNameEnabled, setEditNameEnabled] = useState<boolean>(false);
  const [modalState, setModalState] = useState<ModalState>({
    showVideo: false,
    showMicrophone: false,
    showName: false
  })

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
      displayName: localStorage.getItem("username") || "No name",
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
      console.log("cameras", cameras);
      console.log("devices", devices);

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


  useEffect(() => {

    if (spikabroadcastClient)
      spikabroadcastClient.changeDisplayName(displayName);
    setEditNameEnabled(false);
    localStorage.setItem("username", displayName);
  }, [displayName]);

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
            <div className="info" onClick={e => setModalState({ ...modalState, showName: !modalState.showName })}>{displayName}</div>
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
            <li style={{ width: "67px" }}>
              <a
                className="large_icon"
                onClick={(e) => spikabroadcastClient.toggleCamera()}
              >
                {cameraEnabled ? (
                  <img src={iconCamera} />
                ) : (
                  <img src={iconCameraOff} />
                )}
              </a>
            </li>
            <li className="setting-arrow" onClick={e => setModalState({ ...modalState, showVideo: !modalState.showVideo })}>
              <img src={iconSettingArrow} />
            </li>
            <li style={{ width: "67px" }}>
              <a
                className="large_icon"
                onClick={(e) => spikabroadcastClient.toggleMicrophone()}
              >
                {micEnabled ? (
                  <img src={iconMic} />
                ) : (
                  <img src={iconMicOff} />
                )}
              </a>
            </li>
            <li className="setting-arrow" onClick={e => setModalState({ ...modalState, showMicrophone: !modalState.showMicrophone })}><img src={iconSettingArrow} /></li>
            <li>
              <a className="large_icon">
                <img src={iconUsers} />
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
                  <img src={iconScreenShare} />
                ) : (
                  <img src={iconScreenShareOff} />
                )}
              </a>
            </li>
            <li>
              <a className="button" onClick={(e) => close()}>
                <img src={iconExit} />
              </a>
            </li>
          </ul>
        </div>
      </main >
      <footer></footer>

      {
        modalState.showVideo ? <SettingModal title="Set Video Source" onOK={() => {
          updateDevice();
          setModalState({ ...modalState, showVideo: !modalState.showVideo });
        }} onClose={() => setModalState({ ...modalState, showVideo: !modalState.showVideo })}><>
            <select
              value={selectedCamera.deviceId}
              onChange={e => setSelectedCamera(cameras.find(c => c.deviceId === e.target.value))}>
              {cameras.map((device: MediaDeviceInfo) => <option value={device.deviceId}>{device.label}</option>)}
            </select></>
        </SettingModal> : null
      }

      {
        modalState.showMicrophone ? <SettingModal title="Set Audio Source" onOK={() => {
          updateDevice();
          setModalState({ ...modalState, showMicrophone: !modalState.showMicrophone });
        }} onClose={() => setModalState({ ...modalState, showMicrophone: !modalState.showMicrophone })}><>
            <select
              value={selectedMicrophone.deviceId}
              onChange={e => setSelectedMicrophone(microphones.find(c => c.deviceId === e.target.value))}>
              {microphones.map((device: MediaDeviceInfo) => <option value={device.deviceId}>{device.label}</option>)}
            </select></>
        </SettingModal> : null
      }

      {
        modalState.showName ? <SettingModal title="Set Display Name" onOK={() => {
          setDisplayName(tmpDisplayName);
          setModalState({ ...modalState, showName: !modalState.showName });
        }} onClose={() => setModalState({ ...modalState, showName: !modalState.showName })}><>
            <input type="text" value={tmpDisplayName}
              onChange={(e: React.FormEvent<HTMLInputElement>) =>
                setTmpDisplayName(e.currentTarget.value)
              } /> :
          </>
        </SettingModal> : null
      }
    </div >

  );
}

export default Conference;
