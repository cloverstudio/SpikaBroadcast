import React, {
  useState,
  useEffect,
  useRef,
  MutableRefObject,
  useContext,
} from "react";

import * as Constants from "../lib/Constants";
import { Link, useHistory } from "react-router-dom";

interface errorMessages {
  roomId: string,
  userName: string
}

//function PageCreate({ gc }: { gc: GlobalContextInterface }) {
function PageCreate() {
  let history = useHistory();
  const [videoState, setVideoState] = useState<boolean>(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [microphoneState, setMicrophoneState] = useState<boolean>(false);
  const [deviceStateMessage, setDeviceStateMessage] =
    useState<string>("Waiting devices");
  const [videoReady, setVideoReady] = useState<boolean>(false);
  const [microphoneReady, setMicrophoneReady] = useState<boolean>(false);
  const videoElm: MutableRefObject<HTMLVideoElement | null> =
    useRef<HTMLVideoElement>(null);

  const [roomId, setRoomId] = useState<string>("");
  const [userName, setUserName] = useState<string>(localStorage.getItem(Constants.LSKEY_USERNAME) || "");

  const [errorMessages, setErrorMessages] = useState<errorMessages>({ roomId: "", userName: "" });

  useEffect(() => {
    let audioAccepted: boolean = false;
    let videAccepted: boolean = false;
    // initial video
    (async () => {
      try {
        const audioStream: MediaStream =
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
        setDeviceStateMessage("Waiting camera.");
        setMicrophoneState(false);
      }

      try {
        const videoStream: MediaStream =
          await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true,
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
  }, []);

  // when video element is ready
  useEffect(() => {
    if (videoElm && videoElm.current && videoStream) {
      videoElm.current.srcObject = videoStream;
      videoElm.current.play().catch((error: Error) => console.log(error));
    }
  }, [videoElm, videoStream]);

  const updateGlobal = () => { };
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

                  updateGlobal();

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
                Join
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
                <a className="large_icon">
                  {videoState ? (
                    <i
                      className="fas fa-video"
                      onClick={(e) => {
                        videoReady && setVideoState(!videoState);
                        updateGlobal();
                      }}
                    />
                  ) : (
                    <i
                      className="fas fa-video-slash"
                      onClick={(e) => {
                        videoReady && setVideoState(!videoState);
                        updateGlobal();
                      }}
                    />
                  )}
                </a>
              </li>
              <li>
                <a className="large_icon">
                  {microphoneState ? (
                    <i
                      className="fas fa-microphone"
                      onClick={(e) => {
                        microphoneReady && setMicrophoneState(!microphoneState);
                        updateGlobal();
                      }}
                    />
                  ) : (
                    <i
                      className="fas fa-microphone-slash"
                      onClick={(e) => {
                        microphoneReady && setMicrophoneState(!microphoneState);
                        updateGlobal();
                      }}
                    />
                  )}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </main>
      <footer></footer>
    </div>
  );
}

export default PageCreate;
