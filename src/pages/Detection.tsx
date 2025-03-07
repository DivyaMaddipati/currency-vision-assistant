
import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Camera, StopCircle, Volume2, VolumeX, Loader2 } from "lucide-react";
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
}

interface ModelStatus {
  loading: boolean;
  message: string;
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
  const lastSpokenTimeRef = useRef(Date.now());
  const lastDetectionRef = useRef<string>("");
  const [currentAnnouncement, setCurrentAnnouncement] = useState<string>("");
  const animationFrameRef = useRef<number>();
  const [modelStatus, setModelStatus] = useState<ModelStatus>({ 
    loading: true, 
    message: "Checking model status..." 
  });
  const pendingAnnouncementsRef = useRef<string[]>([]);
  const isAnnouncingRef = useRef(false);
  const previousLanguageRef = useRef(userLanguage);

  // Load user's language preference
  useEffect(() => {
    const fetchUserLanguage = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/profile');
        const data = await response.json();
        if (response.ok && data.language) {
          setUserLanguage(data.language);
          previousLanguageRef.current = data.language;
        }
      } catch (error) {
        console.error('Error loading language preference:', error);
      }
    };
    fetchUserLanguage();
    checkModelsStatus();
  }, []);

  // Check if models are loaded and ready
  const checkModelsStatus = async () => {
    try {
      setModelStatus({ loading: true, message: "Checking model status..." });
      const response = await fetch('http://localhost:5000/api/models_status');
      const data = await response.json();
      
      if (response.ok && data.ready) {
        setModelStatus({ loading: false, message: "" });
      } else {
        setModelStatus({ 
          loading: true, 
          message: data.message || "Models are being prepared, please wait..." 
        });
        // Check again in 3 seconds
        setTimeout(checkModelsStatus, 3000);
      }
    } catch (error) {
      console.error('Error checking model status:', error);
      setModelStatus({ 
        loading: true, 
        message: "Error checking model status. Retrying..." 
      });
      // Retry in 5 seconds on error
      setTimeout(checkModelsStatus, 5000);
    }
  };

  // Effect to monitor language changes
  useEffect(() => {
    if (userLanguage !== previousLanguageRef.current) {
      // Language changed, clear announcements and reset
      console.log(`Language changed from ${previousLanguageRef.current} to ${userLanguage}`);
      cancel(); // Stop any current speech
      pendingAnnouncementsRef.current = []; // Clear queue
      isAnnouncingRef.current = false;
      lastDetectionRef.current = ""; // Reset to allow re-announcing current state
      
      // Update ref to track language changes
      previousLanguageRef.current = userLanguage;
      
      // If camera is active, announce language change
      if (isActive) {
        const languageNames: Record<string, string> = {
          en: "English",
          te: "Telugu",
          hi: "Hindi",
          ja: "Japanese",
          zh: "Chinese",
          es: "Spanish"
        };
        
        translateAndSpeak(`Language changed to ${languageNames[userLanguage] || userLanguage}`, true);
      }
    }
  }, [userLanguage]);

  // Effect to handle muting
  useEffect(() => {
    if (isMuted) {
      cancel();
      pendingAnnouncementsRef.current = [];
      isAnnouncingRef.current = false;
      setCurrentAnnouncement("");
    }
  }, [isMuted, cancel]);

  // Process announcements from queue
  const processAnnouncementQueue = useCallback(async () => {
    if (isAnnouncingRef.current || pendingAnnouncementsRef.current.length === 0 || isMuted) return;
    
    isAnnouncingRef.current = true;
    const announcement = pendingAnnouncementsRef.current.shift();
    
    if (announcement) {
      try {
        const translatedText = userLanguage !== "en" 
          ? await translate(announcement, userLanguage)
          : announcement;
        
        setCurrentAnnouncement(translatedText);
        await speak(translatedText, userLanguage);
      } catch (error) {
        console.error('Error processing announcement:', error);
      } finally {
        isAnnouncingRef.current = false;
        // Process next announcement with a small delay
        setTimeout(processAnnouncementQueue, 300);
      }
    } else {
      isAnnouncingRef.current = false;
    }
  }, [speak, translate, userLanguage, isMuted]);

  // Add announcement to queue
  const translateAndSpeak = useCallback((text: string, forceAnnounce = false) => {
    if (!supported || isMuted) return;
    
    // Don't add duplicate announcements in sequence
    const lastAnnouncement = pendingAnnouncementsRef.current[pendingAnnouncementsRef.current.length - 1];
    if (!forceAnnounce && lastAnnouncement === text) return;
    
    pendingAnnouncementsRef.current.push(text);
    if (!isAnnouncingRef.current) {
      processAnnouncementQueue();
    }
  }, [supported, isMuted, processAnnouncementQueue]);

  const announceDetection = useCallback((objects: DetectedObject[], personCount: number) => {
    if (!supported || isMuted) return;

    const now = Date.now();
    if (now - lastSpokenTimeRef.current < 3000) return;

    const announcements: string[] = [];

    if (personCount > 0) {
      announcements.push(`${personCount} ${personCount === 1 ? 'person' : 'people'} detected`);
    }

    if (objects.length > 0) {
      objects.forEach(obj => {
        announcements.push(
          `${obj.label} detected ${obj.distance ? `${obj.distance} away` : ''} to your ${obj.position}`
        );
      });
    }

    const fullAnnouncement = announcements.join('. ');

    if (fullAnnouncement && fullAnnouncement !== lastDetectionRef.current) {
      translateAndSpeak(fullAnnouncement);
      lastSpokenTimeRef.current = now;
      lastDetectionRef.current = fullAnnouncement;
    }
  }, [supported, isMuted, translateAndSpeak]);

  const detectFrame = async (videoElement: HTMLVideoElement) => {
    if (!videoElement || !canvasRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(videoElement, 0, 0);
    const base64Frame = canvas.toDataURL('image/jpeg');

    try {
      const response = await fetch('http://localhost:5000/api/person/detect_frame', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ frame: base64Frame }),
      });

      if (!response.ok) throw new Error('Frame detection failed');

      const data: DetectionResponse = await response.json();
      console.log("Detection data:", data);
      
      const canvasCtx = canvasRef.current.getContext('2d');
      if (canvasCtx) {
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
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
    // Don't start camera if models aren't ready
    if (modelStatus.loading) {
      toast({
        title: "Models not ready",
        description: "Please wait for models to finish loading",
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
          translateAndSpeak("Camera started. Ready to detect objects.", true);
        };
        setIsActive(true);
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
      pendingAnnouncementsRef.current = []; // Clear the queue
      isAnnouncingRef.current = false;
      setCurrentAnnouncement(""); // Clear the current announcement
      lastDetectionRef.current = ""; // Reset last detection
      lastSpokenTimeRef.current = Date.now(); // Reset timer
    }
  };

  useEffect(() => {
    const detect = async () => {
      if (!videoRef.current || !canvasRef.current || !isActive || !videoLoaded) return;

      if (videoRef.current.readyState !== 4) {
        animationFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      await detectFrame(videoRef.current);
      animationFrameRef.current = requestAnimationFrame(detect);
    };

    if (isActive && videoLoaded) {
      detect();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, videoLoaded]);

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
            <CardTitle className="text-white">Object Detection</CardTitle>
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
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                  {modelStatus.loading ? (
                    <div className="text-center p-6">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-400" />
                      <p className="text-white text-lg mb-2">
                        {modelStatus.message}
                      </p>
                      <p className="text-blue-300 text-sm">
                        This may take a minute the first time
                      </p>
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

        <CurrencyDetection onSpeak={text => !isMuted && translateAndSpeak(text, true)} />

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
