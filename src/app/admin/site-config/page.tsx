'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function SiteConfigPage() {
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroDescription, setHeroDescription] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/site-config');
      const data = await res.json();
      if (data.config) {
        setHeroSubtitle(data.config.hero_subtitle || '');
        setHeroDescription(data.config.hero_description || '');
        setNotice(data.config.notice || '');
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/site-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hero_subtitle: heroSubtitle,
          hero_description: heroDescription,
          notice
        })
      });
      
      if (res.ok) {
        toast.success('保存成功！');
      } else {
        toast.error('保存失败');
      }
    } catch (error) {
      toast.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">首页配置</h1>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            副标题（替代"OIer的乐土"）
          </label>
          <input
            type="text"
            value={heroSubtitle}
            onChange={(e) => setHeroSubtitle(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background"
            placeholder="例如：OIer的乐土"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            描述文字
          </label>
          <textarea
            value={heroDescription}
            onChange={(e) => setHeroDescription(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background min-h-[100px]"
            placeholder="首页英雄区域的描述文字（可选）"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            网站公告
          </label>
          <textarea
            value={notice}
            onChange={(e) => setNotice(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background min-h-[80px]"
            placeholder="显示在首页顶部的公告（可选）"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? '保存中...' : '保存配置'}
        </button>
      </div>
    </div>
  );
}
