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
import Me from "../components/Me";
import dayjs from "dayjs";

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
  const [log, setLog] = useState<Array<any>>([]);
  const [peerContainerClass, setPeerContainerClass] = useState<string>("type1");

  let { roomId }: { roomId?: string } = useParams();

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
          setParticipants(Array.from(participants, ([key, val]) => val));
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
  }, []);

  useEffect(() => {
    if (!participants) return;

    const participantCount = participants.length;
    if (participantCount <= 1) setPeerContainerClass("type1");
    else if (participantCount <= 3) setPeerContainerClass("type2");
    else if (participantCount <= 5) setPeerContainerClass("type3");
    else setPeerContainerClass("type4");
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

  return (
    <div id="spikabroadcast">
      <header></header>
      <main className="conference-main">
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
                onClick={(e) => spikabroadcastClient.toggleScreenShare()}
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
    </div>
  );
}

export default Conference;
