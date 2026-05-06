'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Edit, Trash2, FileText, Eye, EyeOff, BarChart3 } from 'lucide-react';

interface Survey {
  id: number;
  title: string;
  description: string;
  is_active: boolean;
  is_anonymous: boolean;
  created_at: string;
}

interface SurveyQuestion {
  id?: number;
  question_text: string;
  question_type: 'choice' | 'text';
  is_required: boolean;
  options: string[];
}

export default function SurveyManagePage() {
  const router = useRouter();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // 创建/编辑弹窗状态
  const [showModal, setShowModal] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_anonymous: false,
    is_active: true,
    questions: [] as SurveyQuestion[]
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAdmin();
    fetchSurveys();
  }, []);

  const checkAdmin = () => {
    const userCookie = document.cookie.split(';').find(c => c.trim().startsWith('user='));
    if (!userCookie) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(decodeURIComponent(userCookie.split('=')[1]));
    if (!user.role?.includes('admin')) {
      router.push('/');
      return;
    }
    setIsAdmin(true);
  };

  const fetchSurveys = async () => {
    try {
      const res = await fetch('/api/surveys?include_stats=true');
      const data = await res.json();
      setSurveys(data.surveys || []);
    } catch (error) {
      console.error('获取问卷失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingSurvey(null);
    setFormData({
      title: '',
      description: '',
      is_anonymous: false,
      is_active: true,
      questions: []
    });
    setError('');
    setShowModal(true);
  };

  const openEditModal = async (survey: Survey) => {
    try {
      const res = await fetch(`/api/surveys/${survey.id}`);
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }
      
      setEditingSurvey(survey);
      setFormData({
        title: data.survey.title,
        description: data.survey.description || '',
        is_anonymous: data.survey.is_anonymous || false,
        is_active: data.survey.is_active,
        questions: (data.survey.survey_questions || []).map((q: any) => ({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          is_required: q.is_required,
          options: (q.survey_options || []).map((o: any) => o.option_text)
        }))
      });
      setError('');
      setShowModal(true);
    } catch (error) {
      console.error('获取问卷详情失败:', error);
      setError('获取问卷详情失败');
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setError('请输入问卷标题');
      return;
    }
    
    if (formData.questions.length === 0) {
      setError('请至少添加一个问题');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const url = editingSurvey 
        ? `/api/surveys/${editingSurvey.id}` 
        : '/api/surveys';
      const method = editingSurvey ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }
      
      setShowModal(false);
      fetchSurveys();
    } catch (error) {
      console.error('保存失败:', error);
      setError('保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个问卷吗？此操作不可恢复。')) {
      return;
    }

    try {
      const res = await fetch(`/api/surveys/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.error) {
        alert(data.error);
        return;
      }
      
      fetchSurveys();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  };

  const toggleActive = async (survey: Survey) => {
    try {
      await fetch(`/api/surveys/${survey.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: survey.title,
          description: survey.description,
          is_active: !survey.is_active,
          is_anonymous: survey.is_anonymous
        })
      });
      fetchSurveys();
    } catch (error) {
      console.error('更新状态失败:', error);
    }
  };

  const addQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        { question_text: '', question_type: 'choice', is_required: true, options: [''] }
      ]
    }));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    }));
  };

  const addOption = (questionIndex: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === questionIndex 
          ? { ...q, options: [...q.options, ''] }
          : q
      )
    }));
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === questionIndex 
          ? { ...q, options: q.options.map((o, oi) => oi === optionIndex ? value : o) }
          : q
      )
    }));
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === questionIndex 
          ? { ...q, options: q.options.filter((_, oi) => oi !== optionIndex) }
          : q
      )
    }));
  };

  const removeQuestion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">问卷管理</h1>
          <p className="text-gray-600">创建和管理问卷调查</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          创建问卷
        </button>
      </div>

      {surveys.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500 mb-4">还没有问卷</p>
          <button
            onClick={openCreateModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            创建第一个问卷
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {surveys.map((survey) => (
            <div key={survey.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{survey.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      survey.is_active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {survey.is_active ? '进行中' : '已关闭'}
                    </span>
                    {survey.is_anonymous && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">
                        匿名
                      </span>
                    )}
                  </div>
                  {survey.description && (
                    <p className="text-gray-600 text-sm mb-2">{survey.description}</p>
                  )}
                  <p className="text-gray-500 text-sm">
                    创建于 {new Date(survey.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/survey/${survey.id}`}
                    className="p-2 text-gray-600 hover:text-blue-600"
                    title="预览"
                  >
                    <Eye className="h-5 w-5" />
                  </Link>
                  <button
                    onClick={() => toggleActive(survey)}
                    className={`p-2 ${survey.is_active ? 'text-green-600' : 'text-gray-400'} hover:opacity-70`}
                    title={survey.is_active ? '关闭问卷' : '开启问卷'}
                  >
                    {survey.is_active ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => openEditModal(survey)}
                    className="p-2 text-gray-600 hover:text-blue-600"
                    title="编辑"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(survey.id)}
                    className="p-2 text-gray-600 hover:text-red-600"
                    title="删除"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 创建/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {editingSurvey ? '编辑问卷' : '创建问卷'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block font-medium mb-2">问卷标题 *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="请输入问卷标题"
                />
              </div>
              
              <div>
                <label className="block font-medium mb-2">问卷描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  rows={2}
                  placeholder="请输入问卷描述（可选）"
                />
              </div>
              
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_anonymous}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_anonymous: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span>匿名问卷</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span>启用问卷</span>
                </label>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="font-medium">题目列表 *</label>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    + 添加题目
                  </button>
                </div>
                
                {formData.questions.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg text-gray-500">
                    暂无题目，点击上方按钮添加
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.questions.map((question, qIndex) => (
                      <div key={qIndex} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <span className="font-medium">题目 {qIndex + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeQuestion(qIndex)}
                            className="text-red-500 text-sm hover:underline"
                          >
                            删除
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={question.question_text}
                            onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                            placeholder="请输入题目内容"
                          />
                          
                          <div className="flex gap-4">
                            <select
                              value={question.question_type}
                              onChange={(e) => updateQuestion(qIndex, 'question_type', e.target.value)}
                              className="px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                            >
                              <option value="choice">客观题（选择题）</option>
                              <option value="text">主观题（文本）</option>
                            </select>
                            
                            <label className="flex items-center gap-2 py-2">
                              <input
                                type="checkbox"
                                checked={question.is_required}
                                onChange={(e) => updateQuestion(qIndex, 'is_required', e.target.checked)}
                                className="w-4 h-4"
                              />
                              <span>必填</span>
                            </label>
                          </div>
                          
                          {question.question_type === 'choice' && (
                            <div className="space-y-2">
                              <label className="text-sm text-gray-600">选项列表</label>
                              {question.options.map((option, oIndex) => (
                                <div key={oIndex} className="flex gap-2">
                                  <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                                    placeholder={`选项 ${oIndex + 1}`}
                                  />
                                  {question.options.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeOption(qIndex, oIndex)}
                                      className="text-red-500 px-2"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => addOption(qIndex)}
                                className="text-blue-600 text-sm hover:underline"
                              >
                                + 添加选项
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {submitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
