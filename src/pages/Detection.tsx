
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Camera, CircleOff, Loader2, StopCircle, Volume2, VolumeX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useSpeech } from "@/hooks/useSpeech";
import { useTranslation } from "@/hooks/useTranslation";
import CurrencyDetection from "@/components/CurrencyDetection";

interface DetectedObject {
  label: string;
  confidence: number;
  position: string;
  distance: string | null;
  box: number[];
}

interface DetectionResponse {
  objects: DetectedObject[];
  person_count: number;
  frame_height: number;
  frame_width: number;
  is_model_ready?: boolean;
}

const Detection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { speak, speaking, supported, cancel } = useSpeech();
  const { translate } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [userLanguage, setUserLanguage] = useState("en");
  const [modelsReady, setModelsReady] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [personCount, setPersonCount] = useState(0);
  const prevPersonCount = useRef(0);
  const lastSpokenTimeRef = useRef(Date.now());
  const speechQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<string>("");
  const animationFrameRef = useRef<number>();

  // Load user's language preference
  useEffect(() => {
    const fetchUserLanguage = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/profile');
        const data = await response.json();
        if (response.ok && data.language) {
          setUserLanguage(data.language);
        }
      } catch (error) {
        console.error('Error loading language preference:', error);
      }
    };
    fetchUserLanguage();
  }, []);

  // Check if models are ready
  useEffect(() => {
    const checkModelsStatus = async () => {
      if (isChecking) return;
      setIsChecking(true);
      
      try {
        const response = await fetch('http://localhost:5000/api/model_status');
        const data = await response.json();
        
        if (response.ok && data.is_ready) {
          setModelsReady(true);
          setIsChecking(false);
        } else {
          // If models are not ready, check again after 2 seconds
          setTimeout(checkModelsStatus, 2000);
        }
      } catch (error) {
        console.error('Error checking model status:', error);
        // If there was an error, try again after 3 seconds
        setTimeout(checkModelsStatus, 3000);
      }
    };
    
    checkModelsStatus();
    
    return () => {
      setIsChecking(false);
    };
  }, []);

  // Effect to handle muting
  useEffect(() => {
    if (isMuted) {
      cancel();
      setCurrentAnnouncement("");
      speechQueueRef.current = [];
    }
  }, [isMuted, cancel]);

  // Handle the speech queue
  useEffect(() => {
    const processSpeechQueue = async () => {
      if (isMuted || isSpeakingRef.current || speechQueueRef.current.length === 0) return;
      
      isSpeakingRef.current = true;
      const text = speechQueueRef.current.shift() || "";
      
      try {
        const translatedText = userLanguage !== "en" 
          ? await translate(text, userLanguage)
          : text;
        
        setCurrentAnnouncement(translatedText);
        speak(translatedText, userLanguage);
        
        // Wait for the speech to end before processing the next item
        const checkIfSpeaking = setInterval(() => {
          if (!speaking) {
            clearInterval(checkIfSpeaking);
            isSpeakingRef.current = false;
            // Process next item in queue if available
            if (speechQueueRef.current.length > 0) {
              processSpeechQueue();
            }
          }
        }, 500);
      } catch (error) {
        console.error('Translation or speech error:', error);
        isSpeakingRef.current = false;
        // If something went wrong, try with the next message
        if (speechQueueRef.current.length > 0) {
          processSpeechQueue();
        }
      }
    };

    processSpeechQueue();
  }, [speaking, isMuted, translate, speak, userLanguage]);

  const addToSpeechQueue = (text: string) => {
    if (!text || isMuted) return;
    
    speechQueueRef.current.push(text);
    
    // If not currently speaking, start processing the queue
    if (!isSpeakingRef.current) {
      const processSpeechQueue = async () => {
        if (isMuted || isSpeakingRef.current || speechQueueRef.current.length === 0) return;
        
        isSpeakingRef.current = true;
        const queuedText = speechQueueRef.current.shift() || "";
        
        try {
          const translatedText = userLanguage !== "en" 
            ? await translate(queuedText, userLanguage)
            : queuedText;
          
          setCurrentAnnouncement(translatedText);
          speak(translatedText, userLanguage);
        } catch (error) {
          console.error('Translation or speech error:', error);
          isSpeakingRef.current = false;
        }
      };
      
      processSpeechQueue();
    }
  };

  const announceDetection = (objects: DetectedObject[], personCount: number) => {
    if (!supported || isMuted) return;

    const now = Date.now();
    // Only announce if significant time has passed (3 seconds)
    if (now - lastSpokenTimeRef.current < 3000) return;

    // Check if the person count has changed
    if (personCount !== prevPersonCount.current) {
      prevPersonCount.current = personCount;
      
      const countAnnouncement = personCount > 0
        ? `${personCount} ${personCount === 1 ? 'person' : 'people'} detected`
        : "No people detected";
      
      addToSpeechQueue(countAnnouncement);
      lastSpokenTimeRef.current = now;
    }

    // Announce individual objects with a delay between announcements
    if (objects.length > 0) {
      objects.forEach((obj, index) => {
        const objectAnnouncement = `${obj.label} detected ${obj.distance ? `${obj.distance} away` : ''} to your ${obj.position}`;
        addToSpeechQueue(objectAnnouncement);
      });
    }
  };

  const detectFrame = async (videoElement: HTMLVideoElement) => {
    if (!videoElement || !canvasRef.current || !modelsReady) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(videoElement, 0, 0);
    const base64Frame = canvas.toDataURL('image/jpeg');

    try {
      const response = await fetch('http://localhost:5000/api/detect_frame', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ frame: base64Frame }),
      });

      if (!response.ok) throw new Error('Frame detection failed');

      const data: DetectionResponse = await response.json();
      
      // Update person count
      setPersonCount(data.person_count);
      
      const canvasCtx = canvasRef.current.getContext('2d');
      if (canvasCtx) {
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Draw person count on the canvas
        canvasCtx.fillStyle = '#00ff00';
        canvasCtx.font = '20px Arial';
        canvasCtx.fillText(`Person Count: ${data.person_count}`, 10, 30);
        
        data.objects.forEach(obj => {
          const [x, y, x2, y2] = obj.box;
          canvasCtx.strokeStyle = '#00ff00';
          canvasCtx.lineWidth = 2;
          canvasCtx.strokeRect(x, y, x2 - x, y2 - y);
          
          canvasCtx.fillStyle = '#00ff00';
          canvasCtx.font = '16px Arial';
          canvasCtx.fillText(
            `${obj.label} ${obj.distance || ''}`,
            x,
            y - 5
          );
        });
      }

      announceDetection(data.objects, data.person_count);

    } catch (error) {
      console.error('Frame detection error:', error);
    }
  };

  const startCamera = async () => {
    if (!modelsReady) {
      toast({
        title: "Models not ready",
        description: "Please wait for models to load before starting the camera",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setVideoLoaded(true);
          if (canvasRef.current) {
            canvasRef.current.width = videoRef.current!.videoWidth;
            canvasRef.current.height = videoRef.current!.videoHeight;
          }
        };
        setIsActive(true);
        
        // Announce camera started
        addToSpeechQueue("Camera started. Looking for objects.");
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast({
        title: "Error",
        description: "Failed to access camera",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsActive(false);
      setVideoLoaded(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      cancel(); // Cancel any ongoing speech
      setCurrentAnnouncement(""); // Clear the current announcement
      speechQueueRef.current = []; // Clear speech queue
      prevPersonCount.current = 0; // Reset person count
      setPersonCount(0);
      lastSpokenTimeRef.current = Date.now(); // Reset timer
      
      // Announce camera stopped
      addToSpeechQueue("Camera stopped");
    }
  };

  useEffect(() => {
    const detect = async () => {
      if (!videoRef.current || !canvasRef.current || !isActive || !videoLoaded || !modelsReady) return;

      if (videoRef.current.readyState !== 4) {
        animationFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      await detectFrame(videoRef.current);
      animationFrameRef.current = requestAnimationFrame(detect);
    };

    if (isActive && videoLoaded && modelsReady) {
      detect();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, videoLoaded, modelsReady]);

  return (
    <div className="min-h-screen p-4 bg-gradient-to-b from-gray-900 via-blue-900 to-gray-900">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            className="text-white hover:text-blue-300 transition-colors"
            onClick={() => {
              stopCamera();
              navigate("/");
            }}
          >
            ← Back
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="bg-white/10 hover:bg-white/20 transition-all"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? 
                <VolumeX className="h-5 w-5 text-red-400" /> : 
                <Volume2 className="h-5 w-5 text-green-400" />
              }
            </Button>
          </div>
        </div>

        <Card className="bg-black/30 border-none shadow-xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>Object Detection</span>
              {personCount > 0 && (
                <span className="bg-green-600 px-3 py-1 rounded-full text-sm">
                  {personCount} {personCount === 1 ? 'person' : 'people'} detected
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border-2 border-blue-500/30">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
              />
              {!isActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
                  {!modelsReady ? (
                    <div className="text-center">
                      <Loader2 className="h-10 w-10 animate-spin text-blue-400 mx-auto mb-4" />
                      <p className="text-white text-xl mb-2">Loading models...</p>
                      <p className="text-gray-400 text-sm">Please wait while we prepare the detection models</p>
                    </div>
                  ) : (
                    <Button
                      size="lg"
                      className="text-xl bg-blue-600 hover:bg-blue-700 transition-colors"
                      onClick={startCamera}
                    >
                      <Camera className="mr-2 h-6 w-6" />
                      Start Camera
                    </Button>
                  )}
                </div>
              )}
            </div>
            {currentAnnouncement && !isMuted && (
              <div className="mt-4 p-4 rounded-lg bg-white/10 backdrop-blur-sm">
                <p className="text-white text-sm">{currentAnnouncement}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <CurrencyDetection onSpeak={text => !isMuted && addToSpeechQueue(text)} />

        {isActive && (
          <Button
            variant="destructive"
            size="lg"
            className="mt-6 w-full text-xl transition-all hover:bg-red-600"
            onClick={stopCamera}
          >
            <StopCircle className="mr-2 h-6 w-6" />
            Stop Camera
          </Button>
        )}
      </div>
    </div>
  );
};

export default Detection;
