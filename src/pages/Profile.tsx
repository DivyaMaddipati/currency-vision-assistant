import { useEffect } from "react";
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
import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const Profile = () => {
  const [userData, setUserData] = useState({
    name: "",
    phone: "",
    language: "en",
    emergencyContact: {
      name: "",
      relationship: "",
      phone: "",
    },
  });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { translate, isLoading, error } = useTranslation();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      phone: "",
      language: "en",
      emergencyContact: {
        name: "",
        relationship: "",
        phone: "",
      },
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/user_data");
        if (!response.ok) {
          throw new Error("Failed to fetch user data");
        }
        const data = await response.json();
        setUserData(data);
        form.reset(data);
      } catch (error: any) {
        console.error("Error fetching user data:", error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
      }
    };

    fetchData();
  }, [toast, form]);

  async function onSubmit(values: ProfileFormValues) {
    try {
      const response = await fetch("http://localhost:5000/api/update_user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Profile updated successfully!",
        });
        setUserData(values);
      } else {
        throw new Error("Failed to update profile");
      }
    } catch (error: any) {
      console.error("Profile update failed:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  }

  const handleTranslate = async () => {
    if (userData.name) {
      const translatedName = await translate(userData.name, "te");
      toast({
        title: "Translated Name",
        description: translatedName || "Translation failed",
      });
    } else {
      toast({
        title: "No Name",
        description: "No name available to translate.",
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="bg-black/30 border-none shadow-xl backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-white">
            User Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Name</FormLabel>
                    <FormControl>
                      <Input
                        className="bg-black/50 border-none text-white placeholder:text-gray-400"
                        placeholder="John Doe"
                        {...field}
                      />
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
                    <FormLabel className="text-white">Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        className="bg-black/50 border-none text-white placeholder:text-gray-400"
                        placeholder="+1234567890"
                        {...field}
                      />
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
                    <FormLabel className="text-white">Language</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-black/50 border-none text-white placeholder:text-gray-400">
                          <SelectValue placeholder="Select a language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-black/50 border-none text-white placeholder:text-gray-400">
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <p className="text-white font-bold">Emergency Contact</p>
                <FormField
                  control={form.control}
                  name="emergencyContact.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Name</FormLabel>
                      <FormControl>
                        <Input
                          className="bg-black/50 border-none text-white placeholder:text-gray-400"
                          placeholder="Jane Doe"
                          {...field}
                        />
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
                      <FormLabel className="text-white">Relationship</FormLabel>
                      <FormControl>
                        <Input
                          className="bg-black/50 border-none text-white placeholder:text-gray-400"
                          placeholder="Sister"
                          {...field}
                        />
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
                      <FormLabel className="text-white">Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          className="bg-black/50 border-none text-white placeholder:text-gray-400"
                          placeholder="+19876543210"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit">Update Profile</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Button
        onClick={handleTranslate}
        disabled={isLoading}
        className="mt-4 bg-blue-500 text-white rounded px-4 py-2 hover:bg-blue-700"
      >
        {isLoading ? "Translating..." : "Translate Name to Telugu"}
      </Button>
      {error && <p className="text-red-500 mt-2">Error: {error}</p>}
    </div>
  );
};

export default Profile;
