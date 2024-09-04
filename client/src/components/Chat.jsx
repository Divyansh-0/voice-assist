import { useState, useEffect, useCallback } from "react";

import { CiMicrophoneOn, CiMicrophoneOff } from "react-icons/ci";
import axios from "axios";

import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

const Chat = () => {
  const [file, setFile] = useState(null);
  const [filename, setFilename] = useState("");
  const [question, setQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [micOpen, setMicOpen] = useState(false);
  const [microphone, setMicrophone] = useState(null);
  const [userMedia, setUserMedia] = useState(null);
  const [transcript, setTranscript] = useState("");

  const [audio, setAudio] = useState(null);

  let socket = null;

  const DEEPGRAM_API_KEY = "";

  const NEETS_API_KEY = "";

  const langSup = {
    Hindi: {
      neet: {
        model: "vits",
        voice_id: "vits-hin-1",
      },
      deep: {
        language: "hi",
      },
      flag_llm: "Hindi",
    },
    English: {
      neet: {
        model: "style-diff-500",
        voice_id: "us-female-2",
      },
      deep: {
        language: "en",
      },
      flag_llm: "English",
    },
  };

  const [selectedLanguage, setSelectedLanguage] = useState("English");

  const audioHandler = useCallback(async () => {
    console.log("audioHandler invoked. micOpen:", micOpen);

    if (microphone && userMedia) {
      console.log("Stopping microphone and releasing media resources...");
      microphone.stop();
      setUserMedia(null);
      setMicrophone(null);
      console.log("Microphone stopped and resources released.");
    } else {
      try {
        console.log("Requesting user media...");
        const userMedia = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        console.log("User media acquired. Initializing MediaRecorder...");
        const microphone = new MediaRecorder(userMedia);

        const socket = new WebSocket(
          `wss://api.deepgram.com/v1/listen?language=${langSup[selectedLanguage].deep.language}`,
          ["token", DEEPGRAM_API_KEY]
        );

        socket.onopen = () => {
          console.log("WebSocket connection established.");

          microphone.ondataavailable = (event) => {
            if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
              socket.send(event.data);
            }
          };

          microphone.start(100); // Start recording and send data every 100ms
        };

        socket.onmessage = (msg) => {
          const data = JSON.parse(msg.data);
          const ptranscript = data.channel.alternatives[0]?.transcript || "";
          console.log("Transcript:", ptranscript);
          setTranscript((prevtranscript) => prevtranscript + ptranscript);
        };

        socket.onerror = (error) => {
          console.error("WebSocket error:", error);
        };

        microphone.onstart = () => {
          console.log("Recording started.");
          setMicOpen(true);
        };

        microphone.onstop = () => {
          console.log("Recording stopped.");
          setMicOpen(false);

          if (socket.readyState === WebSocket.OPEN) {
            socket.close();
          }
        };

        console.log("Setting userMedia and microphone in state...");
        setUserMedia(userMedia);
        setMicrophone(microphone);
        console.log("Microphone setup complete.");
      } catch (error) {
        console.error("Error accessing microphone:", error);
      }
    }
  }, [microphone, userMedia, micOpen, selectedLanguage]);

  useEffect(() => {
    if (fileUploaded) {
      console.log("File uploaded successfully, resetting file state...");
      setFile(null);
    }
  }, [fileUploaded]);

  const closeConnection = () => {
    console.log("Closing connection...");

    if (microphone) {
      console.log("Stopping microphone...");
      microphone.stop();
    }

    if (userMedia) {
      console.log("Releasing user media resources...");
      userMedia.getTracks().forEach((track) => track.stop());
      setUserMedia(null);
    }

    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log("Closing WebSocket...");
      socket.close();
    }

    setMicrophone(null);
    setMicOpen(false);
    console.log("Connection closed.");
    if (transcript) {
      console.log("Transcript:", transcript);
      setQuestion(transcript.trim()); // Set the current transcript as the question
      // Clear the transcript to prevent it from carrying over to the next question
      console.log("FUNC CALLED");
      handleQs(transcript);

      setTranscript("");
    }
  };

  const handleTTS = (text) => {
    console.log("Handling TTS for text:", text);
    axios
      .post(
        "https://api.neets.ai/v1/tts",
        {
          text,
          voice_id: langSup[selectedLanguage].neet.voice_id,
          params: {
            model: langSup[selectedLanguage].neet.model,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": NEETS_API_KEY,
          },
          responseType: "arraybuffer",
        }
      )
      .then((response) => {
        console.log("TTS response received, playing audio...");
        const blob = new Blob([response.data], {
          type: "audio/mp3",
        });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        setAudio(audio);
        console.log("Audio set, playing...");
        setTimeout(50);
        audio.play();
      })
      .catch((error) => {
        console.error("Error in TTS:", error);
      });
  };

  const handleFileChange = (e) => {
    console.log("File selected:", e.target.files[0]);
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file to upload.");
      return;
    }

    console.log("Uploading file...");
    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      const res = await axios.post("http://localhost:8000/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      console.log("File uploaded successfully:", res.data.filename);
      alert("File uploaded successfully!");
      setFilename(res.data.filename);
      setFileUploaded(true);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload the file.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionSubmit = async () => {
    if (!question) {
      alert("Please enter a question.");
      return;
    }

    console.log("Submitting question:", question);
    const newChatMessages = [
      ...chatMessages,
      { sender: "user", message: question },
    ];
    setChatMessages(newChatMessages);

    try {
      setLoading(true);
      const res = await axios.post("http://localhost:8000/rag", {
        question: `${question}. Please answer back in ${langSup[selectedLanguage].flag_llm} language.`,
        filename,
      });

      console.log("RAG response received:", res.data.response);
      handleTTS(res.data.response);
      setChatMessages([
        ...newChatMessages,
        { sender: "ai", message: res.data.response },
      ]);
      setQuestion("");
    } catch (error) {
      console.error("Error fetching response:", error);
      alert("Failed to fetch the response.");
    } finally {
      setLoading(false);
    }
  };

  const handleChatSubmit = async () => {
    const userId = sessionStorage.getItem("userID");
    if (!userId || chatMessages.length === 0) {
      alert("Please provide a User ID and ensure there are chat messages.");
      return;
    }

    console.log("Submitting chat history...");

    try {
      const response = await axios.post("http://localhost:8000/submit_chat", {
        user_id: userId,
        chat_history: chatMessages,
      });

      console.log("Chat submission response:", response.data);
      const { user_summary, user_sentiment, ai_summary, ai_sentiment } =
        response.data;

      // Update the Firestore document for the user with the summaries and sentiments
      const userDocRef = doc(db, "users", userId); // Assuming "users" is your Firestore collection

      await updateDoc(userDocRef, {
        user_summary: user_summary,
        user_sentiment: user_sentiment,
        ai_summary: ai_summary,
        ai_sentiment: ai_sentiment,
      });

      alert("Chat history submitted and Firestore updated successfully!");
    } catch (error) {
      console.error("Error submitting chat history:", error);
      alert("Failed to submit chat history or update Firestore.");
    }
  };

  const handleQs = async (currentQuestion) => {
    if (!currentQuestion) {
      alert("Please enter a question.");
      return;
    }

    console.log("Submitting question:", currentQuestion);
    const newChatMessages = [
      ...chatMessages,
      { sender: "user", message: currentQuestion },
    ];
    setChatMessages(newChatMessages);

    try {
      setLoading(true);
      const res = await axios.post("http://localhost:8000/rag", {
        question: `${currentQuestion}. Please answer back in ${langSup[selectedLanguage].flag_llm} language.`,
        filename,
      });

      console.log("RAG response received:", res.data.response);
      handleTTS(res.data.response);
      setChatMessages([
        ...newChatMessages,
        { sender: "ai", message: res.data.response },
      ]);
      setQuestion(""); // Clear the question after submission
    } catch (error) {
      console.error("Error fetching response:", error);
      alert("Failed to fetch the response.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-6 bg-gray-100 h-screen w-[800px] mx-auto mt-2 ">
      <h1 className="text-3xl font-bold text-blue-700 mb-8">
        AI Insurance Agent
      </h1>

      {/* Language Selection */}

      {/* PDF Upload */}
      {!fileUploaded && (
        <div className="w-full  mb-2">
          <label className="block mb-2 text-sm font-semibold text-gray-700">
            Upload PDF:
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg bg-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
          />
          <button
            onClick={handleUpload}
            className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 focus:outline-none transition-colors duration-300"
            disabled={loading}
          >
            {loading ? "Uploading..." : "Upload"}
          </button>
        </div>
      )}

      {/* Chat Window */}
      <div className="w-full mt-2">
        <div className="chat-window bg-white p-4 border border-gray-300 rounded-lg shadow-lg overflow-y-auto h-96">
          {chatMessages.map((chat, index) => (
            <div
              key={index}
              className={`chat-message mb-4 ${
                chat.sender === "user" ? "text-right" : "text-left"
              }`}
            >
              <p
                className={`inline-block px-4 py-2 rounded-lg shadow ${
                  chat.sender === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                {chat.message}
              </p>
            </div>
          ))}
        </div>

        {/* Input and Controls */}
        <div className="mt-4 space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter your question"
              className="flex-grow text-sm text-gray-900 border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <button
              onClick={handleQuestionSubmit}
              className="px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 focus:outline-none transition-colors duration-300"
              disabled={loading}
            >
              Send
            </button>
            <div className="flex items-center">
              <div
                className={`p-2 rounded-full cursor-pointer shadow ${
                  micOpen ? "bg-red-600 text-white" : "bg-gray-400 text-black"
                } transition-colors duration-300`}
                onClick={micOpen ? closeConnection : audioHandler}
                title={micOpen ? "Stop Recording" : "Start Recording"}
              >
                {micOpen ? (
                  <CiMicrophoneOff className="text-3xl" />
                ) : (
                  <CiMicrophoneOn className="text-3xl" />
                )}
              </div>
            </div>
          </div>

          <div className="w-full flex items-center space-x-4 justify-evenly">
            <label className="text-sm font-semibold text-gray-700">
              Select Language:
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">English</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedLanguage === "Hindi"}
                  onChange={(e) =>
                    setSelectedLanguage(e.target.checked ? "Hindi" : "English")
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-600 peer-focus:ring-4 peer-focus:ring-blue-200 peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
              <span className="text-sm font-medium text-gray-700">Hindi</span>
            </div>
            <button
              onClick={handleChatSubmit}
              className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 focus:outline-none transition-colors duration-300"
            >
              Submit Chat
            </button>
          </div>
        </div>

        {/* Submit Chat */}
      </div>
    </div>
  );
};

export default Chat;
