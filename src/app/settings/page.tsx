"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Upload, Lock, User, Camera, Save } from "lucide-react";

interface User {
  id: number;
  username: string;
  bio?: string;
  avatar?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 头像相关
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // 简介相关
  const [bio, setBio] = useState("");
  const [isSavingBio, setIsSavingBio] = useState(false);

  // 密码相关
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setUser(data.user);
      setBio(data.user?.bio || "");
    } catch {
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);

      // 创建预览
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) {
      toast.error("请选择头像文件");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", avatarFile);

      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("头像上传成功");
        setAvatarFile(null);
        setAvatarPreview(null);
        fetchUser();
      } else {
        toast.error(data.error || "上传失败");
      }
    } catch {
      toast.error("上传失败");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleBioSave = async () => {
    setIsSavingBio(true);
    try {
      const res = await fetch("/api/user/bio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("个人简介已更新");
        fetchUser();
      } else {
        toast.error(data.error || "更新失败");
      }
    } catch {
      toast.error("更新失败");
    } finally {
      setIsSavingBio(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("请填写所有密码字段");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("两次输入的新密码不一致");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("新密码至少需要6个字符");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("密码修改成功");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(data.error || "修改失败");
      }
    } catch {
      toast.error("修改失败");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回首页
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">个人设置</h1>
        <div className="w-24" /> {/* 占位，保持居中 */}
      </div>

      <Tabs defaultValue="avatar" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="avatar" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            头像设置
          </TabsTrigger>
          <TabsTrigger value="bio" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            个人简介
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            修改密码
          </TabsTrigger>
        </TabsList>

        {/* 头像设置 */}
        <TabsContent value="avatar">
          <Card>
            <CardHeader>
              <CardTitle>头像设置</CardTitle>
              <CardDescription>
                上传您的个人头像，支持 JPG、PNG、GIF、WebP 格式，最大 2MB
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-4xl">
                      {user?.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {avatarPreview && (
                    <Avatar className="h-32 w-32 absolute top-0 left-0">
                      <AvatarImage src={avatarPreview} />
                    </Avatar>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <Label
                    htmlFor="avatar-upload"
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted transition-colors">
                      <Upload className="h-4 w-4" />
                      选择图片
                    </div>
                  </Label>
                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />

                  {avatarFile && (
                    <Button
                      onClick={handleAvatarUpload}
                      disabled={isUploadingAvatar}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isUploadingAvatar ? "上传中..." : "保存头像"}
                    </Button>
                  )}
                </div>

                {avatarFile && (
                  <p className="text-sm text-muted-foreground">
                    已选择: {avatarFile.name} ({(avatarFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 个人简介 */}
        <TabsContent value="bio">
          <Card>
            <CardHeader>
              <CardTitle>个人简介</CardTitle>
              <CardDescription>
                填写个人简介，让其他用户更好地了解你
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bio">个人简介</Label>
                <Textarea
                  id="bio"
                  placeholder="介绍一下你自己..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="min-h-[150px]"
                  maxLength={500}
                />
                <p className="text-sm text-muted-foreground text-right">
                  {bio.length}/500
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleBioSave}
                  disabled={isSavingBio}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSavingBio ? "保存中..." : "保存简介"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 修改密码 */}
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>修改密码</CardTitle>
              <CardDescription>
                为了账户安全，建议定期更换密码
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="old-password">旧密码</Label>
                <Input
                  id="old-password"
                  type="password"
                  placeholder="请输入当前密码"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">新密码</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="请输入新密码（至少6个字符）"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">确认新密码</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="请再次输入新密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handlePasswordChange}
                  disabled={isChangingPassword}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isChangingPassword ? "修改中..." : "修改密码"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
