'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, BarChart3, Users, Clock } from 'lucide-react';

interface Survey {
  id: number;
  title: string;
  description: string;
  question_count: number;
  answer_count: number;
  is_anonymous: boolean;
  created_at: string;
  questions?: any[];
}

export default function SurveyPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSurvey, setExpandedSurvey] = useState<number | null>(null);

  useEffect(() => {
    fetchSurveys();
  }, []);

  // 检查是否是管理员
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    try {
      const userCookie = document.cookie.split(';').find(c => c.trim().startsWith('user='));
      if (userCookie) {
        const user = JSON.parse(decodeURIComponent(userCookie.split('=')[1]));
        const roleStr = user.role || '';
        if (roleStr.includes('admin') || roleStr === 'admin' || roleStr === 'super_admin') {
          setIsAdmin(true);
        }
      }
    } catch (e) {}
  }, []);

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

  const toggleExpand = (surveyId: number) => {
    setExpandedSurvey(expandedSurvey === surveyId ? null : surveyId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">问卷调查</h1>
          <p className="text-gray-600">参与问卷调查，帮助我们做得更好</p>
        </div>
        {isAdmin && (
          <Link href="/admin/survey">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              管理问卷
            </button>
          </Link>
        )}
      </div>

      {surveys.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">暂无问卷</p>
        </div>
      ) : (
        <div className="space-y-6">
          {surveys.map((survey) => (
            <div key={survey.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div 
                className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleExpand(survey.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-2">{survey.title}</h2>
                    {survey.description && (
                      <p className="text-gray-600 mb-4">{survey.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {survey.question_count} 个题目
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {survey.answer_count} 人已回答
                      </span>
                      {survey.is_anonymous && (
                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">
                          匿名
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/survey/${survey.id}`}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {survey.answer_count > 0 ? '查看/继续回答' : '立即参与'}
                    </Link>
                  </div>
                </div>
              </div>

              {/* 展开的统计信息 */}
              {expandedSurvey === survey.id && survey.questions && survey.questions.length > 0 && (
                <div className="border-t bg-gray-50 p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    问卷统计
                  </h3>
                  <div className="space-y-6">
                    {survey.questions.map((question: any, qIndex: number) => (
                      <div key={question.id} className="bg-white rounded-lg p-4">
                        <p className="font-medium mb-3">
                          {qIndex + 1}. {question.question_text}
                          {question.is_required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                          <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                            {question.question_type === 'choice' ? '客观题' : '主观题'}
                          </span>
                        </p>
                        
                        {question.question_type === 'choice' && question.option_stats && (
                          <div className="space-y-2">
                            {question.option_stats.map((option: any) => {
                              const percentage = option.percentage || 0;
                              return (
                                <div key={option.id} className="flex items-center gap-3">
                                  <div className="flex-1">
                                    <div className="flex justify-between text-sm mb-1">
                                      <span>{option.option_text}</span>
                                      <span className="text-gray-500">
                                        {option.count} 票 ({percentage}%)
                                      </span>
                                    </div>
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {question.question_type === 'text' && (
                          <p className="text-gray-500 text-sm">
                            已有 {question.answer_count || 0} 人回答
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
