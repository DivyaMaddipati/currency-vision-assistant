
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";

// Import the initial user data
import userData from '../data/userData.json';

const Profile = () => {
  const [name, setName] = useState(userData.name);
  const [phone, setPhone] = useState(userData.phone);
  const [language, setLanguage] = useState(userData.language);
  const [emergencyContact, setEmergencyContact] = useState(userData.emergencyContact);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Load user data when component mounts
    try {
      const savedData = localStorage.getItem('userData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setName(parsedData.name);
        setPhone(parsedData.phone);
        setLanguage(parsedData.language);
        setEmergencyContact(parsedData.emergencyContact);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, []);

  const handleSave = () => {
    // Create updated user data object
    const updatedUserData = {
      name,
      phone,
      language,
      emergencyContact
    };

    // Save to localStorage
    try {
      localStorage.setItem('userData', JSON.stringify(updatedUserData));
      toast({
        title: "Profile Updated",
        description: "Your settings have been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving user data:', error);
      toast({
        title: "Error",
        description: "Failed to save your settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20">
      <div className="max-w-md mx-auto space-y-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate("/")}
        >
          ← Back
        </Button>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <Eye className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Profile Settings
            </h1>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-lg font-medium text-gray-700">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 text-lg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-lg font-medium text-gray-700">Phone Number</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12 text-lg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-lg font-medium text-gray-700">Preferred Language</label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-12 text-lg bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg">
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Emergency Contact</h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-lg font-medium text-gray-700">Contact Name</label>
                  <Input
                    value={emergencyContact.name}
                    onChange={(e) => setEmergencyContact(prev => ({ ...prev, name: e.target.value }))}
                    className="h-12 text-lg"
                    placeholder="Enter emergency contact name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-lg font-medium text-gray-700">Relationship</label>
                  <Input
                    value={emergencyContact.relationship}
                    onChange={(e) => setEmergencyContact(prev => ({ ...prev, relationship: e.target.value }))}
                    className="h-12 text-lg"
                    placeholder="e.g., Parent, Spouse, Sibling"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-lg font-medium text-gray-700">Contact Number</label>
                  <Input
                    value={emergencyContact.phone}
                    onChange={(e) => setEmergencyContact(prev => ({ ...prev, phone: e.target.value }))}
                    className="h-12 text-lg"
                    placeholder="Enter emergency contact number"
                  />
                </div>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 mt-6"
              onClick={handleSave}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
