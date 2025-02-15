
import { useEffect, useState } from "react";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type ProfileFormValues } from "@/lib/validations/profile";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/useTranslation";

const Profile = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { translate, isLoading: translationLoading } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState("en");
  const [translatedTexts, setTranslatedTexts] = useState({
    title: "Profile Settings",
    name: "Name",
    phone: "Phone Number",
    language: "Preferred Language",
    emergency: "Emergency Contact",
    contactName: "Contact Name",
    relationship: "Relationship",
    contactNumber: "Contact Number",
    save: "Save Changes",
    back: "Back"
  });

  const [userData, setUserData] = useState<ProfileFormValues>({
    name: "",
    phone: "",
    language: "en",
    emergencyContact: {
      name: "",
      relationship: "",
      phone: ""
    }
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: userData
  });

  // Fetch user data and set language
  useEffect(() => {
    const fetchAndSetup = async () => {
      await fetchUserData();
    };
    fetchAndSetup();
  }, []);

  // Update translations whenever language changes
  useEffect(() => {
    const updateTranslations = async () => {
      if (currentLanguage !== "en") {
        const translatedObj: any = {};
        for (const [key, value] of Object.entries(translatedTexts)) {
          const translated = await translate(value, currentLanguage);
          translatedObj[key] = translated;
        }
        setTranslatedTexts(translatedObj);
      } else {
        // Reset to default English texts
        setTranslatedTexts({
          title: "Profile Settings",
          name: "Name",
          phone: "Phone Number",
          language: "Preferred Language",
          emergency: "Emergency Contact",
          contactName: "Contact Name",
          relationship: "Relationship",
          contactNumber: "Contact Number",
          save: "Save Changes",
          back: "Back"
        });
      }
    };

    updateTranslations();
  }, [currentLanguage, translate]);

  const fetchUserData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/profile');
      const data = await response.json();
      if (response.ok) {
        const validData: ProfileFormValues = {
          name: data.name || "",
          phone: data.phone || "",
          language: data.language || "en",
          emergencyContact: {
            name: data.emergencyContact?.name || "",
            relationship: data.emergencyContact?.relationship || "",
            phone: data.emergencyContact?.phone || ""
          }
        };
        setUserData(validData);
        form.reset(validData);
        // Set the current language from the fetched data
        setCurrentLanguage(data.language || "en");
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      const response = await fetch('http://localhost:5000/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();
      
      if (response.ok) {
        setUserData(values);
        toast({
          title: "Profile Updated",
          description: "Your settings have been saved successfully.",
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error saving user data:', error);
      toast({
        title: "Error",
        description: "Failed to save your settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLanguageChange = async (value: string) => {
    setCurrentLanguage(value);
    form.setValue("language", value);
  };

  if (translationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20">
      <div className="max-w-md mx-auto space-y-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate("/")}
        >
          ← {translatedTexts.back}
        </Button>

        <Card className="bg-white/80 backdrop-blur-md shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Eye className="w-8 h-8 text-blue-600" />
              <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {translatedTexts.title}
              </span>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{translatedTexts.name}</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-12 text-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{translatedTexts.phone}</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-12 text-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{translatedTexts.language}</FormLabel>
                      <Select onValueChange={handleLanguageChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 text-lg bg-background">
                            <SelectValue placeholder="Select a language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border shadow-lg">
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="te">తెలుగు (Telugu)</SelectItem>
                          <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t pt-6 mt-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">{translatedTexts.emergency}</h2>
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="emergencyContact.name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{translatedTexts.contactName}</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-12 text-lg" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="emergencyContact.relationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{translatedTexts.relationship}</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-12 text-lg" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="emergencyContact.phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{translatedTexts.contactNumber}</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-12 text-lg" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
                >
                  {translatedTexts.save}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
