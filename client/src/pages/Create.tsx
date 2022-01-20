import React, {
  useState,
  useEffect,
  useRef,
  MutableRefObject,
  useContext,
} from "react";

import * as Constants from "../lib/Constants";
import { Link, useHistory } from "react-router-dom";

import MicrophoneSelectorModal from "../components/MicrophoneSelectorModal";
import VideoSelectorModal from "../components/VideoSelectorModal";

import iconCamera from "../../../assets/img/camera.svg";
import iconMic from "../../../assets/img/mic.svg";
import iconCameraOff from "../../../assets/img/cameraoff.svg";
import iconMicOff from "../../../assets/img/micoff.svg";
import iconSettingArrow from "../../../assets/img/settingarrow.svg";

interface errorMessages {
  roomId: string,
  userName: string
}


interface ModalState {
  showVideo: boolean;
  showMicrophone: boolean;
}


//function PageCreate({ gc }: { gc: GlobalContextInterface }) {
function PageCreate() {
  let history = useHistory();
  const [videoState, setVideoState] = useState<boolean>(localStorage.getItem(Constants.LSKEY_MUTECAM) === "0" ? false : true);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [microphoneState, setMicrophoneState] = useState<boolean>(localStorage.getItem(Constants.LSKEY_MUTEMIC) === "0" ? false : true);
  const [deviceStateMessage, setDeviceStateMessage] =
    useState<string>("Waiting permission");
  const [videoReady, setVideoReady] = useState<boolean>(false);
  const [microphoneReady, setMicrophoneReady] = useState<boolean>(false);
  const videoElm: MutableRefObject<HTMLVideoElement | null> =
    useRef<HTMLVideoElement>(null);

  const [selectedCamera, setSelectedCamera] = useState<MediaDeviceInfo>(null);
  const [selectedMicrophone, setSelectedMicrophone] = useState<MediaDeviceInfo>(null);

  const [roomId, setRoomId] = useState<string>(localStorage.getItem(Constants.LSKEY_LASTROOM));
  const [userName, setUserName] = useState<string>(localStorage.getItem(Constants.LSKEY_USERNAME) || "");

  const [errorMessages, setErrorMessages] = useState<errorMessages>({ roomId: "", userName: "" });
  const [modalState, setModalState] = useState<ModalState>({
    showVideo: false,
    showMicrophone: false
  })


  useEffect(() => {
    updateDevice();
  }, []);

  // when video element is ready
  useEffect(() => {
    if (videoElm && videoElm.current && videoStream) {
      videoElm.current.srcObject = videoStream;
      videoElm.current.play().catch((error: Error) => console.log(error));
    }
  }, [videoElm, videoStream]);

  useEffect(() => {
    localStorage.setItem(Constants.LSKEY_MUTECAM, videoState ? "1" : "0");
    localStorage.setItem(Constants.LSKEY_MUTEMIC, microphoneState ? "1" : "0");
    updateDevice();
  }, [videoState, microphoneState]);


  const updateDevice = () => {

    let audioAccepted: boolean = false;
    let videAccepted: boolean = false;

    // initial video
    if (videoState) {
      (async () => {
        try {

          let cameraDeviceId = null;
          if (!selectedCamera)
            cameraDeviceId = localStorage.getItem(Constants.LSKEY_SELECTEDCAM);
          else
            cameraDeviceId = selectedCamera.deviceId;

          const videoStream: MediaStream =
            cameraDeviceId ? await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: {
                deviceId: cameraDeviceId
              },
            }) :
              await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: true
              });

          setVideoState(true);
          setVideoStream(videoStream);
          setVideoReady(true);

          if (audioAccepted) setDeviceStateMessage("Device ready.");
          else setDeviceStateMessage("Camera ready.");

        } catch (e) {
          if (audioAccepted) setDeviceStateMessage("Microphone is ready.");
          else setDeviceStateMessage("Devices are not ready.");
          setVideoState(false);
        }
      })();

    }

    // initial mic
    if (microphoneState) {
      (async () => {
        try {
          let micDeviceId = null;
          if (!selectedMicrophone)
            micDeviceId = localStorage.getItem(Constants.LSKEY_SELECTEDMIC);
          else
            micDeviceId = selectedMicrophone.deviceId;

          const audioStream: MediaStream =
            micDeviceId ? await navigator.mediaDevices.getUserMedia({
              audio: {
                deviceId: micDeviceId
              },
              video: false,
            }) :
              await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false,
              });

          const audioTrack: MediaStreamTrack = audioStream.getAudioTracks()[0];
          setMicrophoneState(true);
          setDeviceStateMessage("Microphone ready, waiting camera.");
          setMicrophoneReady(true);
          audioAccepted = true;

          if (audioStream) {
            audioStream.getTracks().forEach(function (track) {
              if (track.readyState == "live") {
                track.stop();
              }
            });
          }

        } catch (e) {
          setDeviceStateMessage("Waiting Microphone.");
          setMicrophoneState(false);
        }

      })();
    }

  }

  return (
    <div id="spikabroadcast">
      <header></header>
      <main className="bg_color_gray">
        <div id="entry_meeting">
          <h3>Host a new meeting</h3>
          <ul>
            <li>
              <input
                type="text"
                className="meeting_link"
                placeholder="Room identifier"
                value={roomId}
                onChange={(e: React.FormEvent<HTMLInputElement>) =>
                  setRoomId(e.currentTarget.value)
                }
              />
              <span className="error-message">{errorMessages.roomId}</span>
            </li>
            <li>
              <input
                type="text"
                className="meeting_link"
                placeholder="User name"
                value={userName}
                onChange={(e: React.FormEvent<HTMLInputElement>) =>
                  setUserName(e.currentTarget.value)
                }
              />
              <span className="error-message">{errorMessages.userName}</span>
            </li>
            <li>
              <a
                className="style_blue"
                onClick={(e) => {
                  if (roomId.length === 0)
                    return setErrorMessages({
                      roomId: "Please enter a room number.",
                      userName: ""
                    });

                  else if (userName.length === 0)
                    return setErrorMessages({
                      roomId: "",
                      userName: "Please enter a user name"
                    });
                  else setErrorMessages({ roomId: "", userName: "" });

                  localStorage.setItem(Constants.LSKEY_USERNAME, userName);

                  if (videoStream) {
                    videoStream.getTracks().forEach(function (track) {
                      if (track.readyState == "live") {
                        track.stop();
                      }
                    });
                  }

                  history.push(`/conference/${roomId}`);
                }}
              >
                Create
              </a>
            </li>
          </ul>

          <div id="camera">
            <div
              style={{ display: videoState ? "none" : "flex" }}
              className="device_state_message"
            >
              {deviceStateMessage}
            </div>
            <video
              style={{ display: videoState ? "block" : "none" }}
              ref={videoElm}
              autoPlay={true}
              playsInline={true}
            />
            <ul>
              <li>
                <a className="large_icon" onClick={e => {
                  setVideoState(!videoState);
                }}>
                  {videoState ? (
                    <img src={iconCamera} />
                  ) : (
                    <img src={iconCameraOff} />
                  )}
                </a>
              </li>
              <li className="setting-arrow" >
                <img src={iconSettingArrow} onClick={e => setModalState({ ...modalState, showVideo: !modalState.showVideo })} />
              </li>
              <li>
                <a className="large_icon" onClick={(e) => {
                  setMicrophoneState(!microphoneState);
                }}>
                  {microphoneState ? (
                    <img src={iconMic} />
                  ) : (
                    <img src={iconMicOff} />
                  )}
                </a>
              </li>
              <li className="setting-arrow" onClick={e => setModalState({ ...modalState, showMicrophone: !modalState.showMicrophone })}>
                <img src={iconSettingArrow} />
              </li>
            </ul>
          </div>
        </div>

        {
          modalState.showVideo ? <VideoSelectorModal
            selectedDeviceId={selectedCamera ? selectedCamera.deviceId : localStorage.getItem(Constants.LSKEY_SELECTEDCAM)}
            onOK={() => {
              updateDevice();
              setModalState({ ...modalState, showVideo: !modalState.showVideo });
              if (selectedCamera) localStorage.setItem(Constants.LSKEY_SELECTEDCAM, selectedCamera.deviceId);
            }}
            onClose={() => setModalState({ ...modalState, showVideo: !modalState.showVideo })}
            onChange={(media: MediaDeviceInfo) => { setSelectedCamera(media) }} /> : null
        }

        {
          modalState.showMicrophone ? <MicrophoneSelectorModal
            selectedDeviceId={selectedMicrophone ? selectedMicrophone.deviceId : localStorage.getItem(Constants.LSKEY_SELECTEDMIC)}
            onOK={() => {
              updateDevice();
              setModalState({ ...modalState, showMicrophone: !modalState.showMicrophone });
              localStorage.setItem(Constants.LSKEY_SELECTEDMIC, selectedMicrophone.deviceId);
            }}
            onClose={() => setModalState({ ...modalState, showMicrophone: !modalState.showMicrophone })}
            onChange={(media: MediaDeviceInfo) => { setSelectedMicrophone(media) }} /> : null
        }

      </main >
      <footer></footer>
    </div >
  );
}

export default PageCreate;
