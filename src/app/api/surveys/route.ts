import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const client = await getAdminSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const includeStats = searchParams.get('include_stats') === 'true';
    
    // 获取所有问卷
    const { data: surveys, error } = await client
      .from('surveys')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!surveys || surveys.length === 0) {
      return NextResponse.json({ surveys: [] });
    }
    
    if (!includeStats) {
      return NextResponse.json({ surveys });
    }
    
    // 获取每个问卷的回答统计
    const surveysWithStats = await Promise.all(
      surveys.map(async (survey) => {
        // 获取题目数量
        const { count: questionCount } = await client
          .from('survey_questions')
          .select('*', { count: 'exact', head: true })
          .eq('survey_id', survey.id);
        
        // 获取回答人数
        const { count: answerCount } = await client
          .from('survey_answers')
          .select('user_id', { count: 'exact', head: true })
          .eq('question_id', 
            client.from('survey_questions').select('id').eq('survey_id', survey.id)
          );
        
        // 获取各题目的回答统计
        const { data: questions } = await client
          .from('survey_questions')
          .select(`
            id, question_text, question_type,
            survey_options (id, option_text)
          `)
          .eq('survey_id', survey.id)
          .order('display_order');
        
        let questionStats = [];
        if (questions) {
          questionStats = await Promise.all(
            questions.map(async (q: any) => {
              if (q.question_type === 'text') {
                // 主观题：获取回答数量
                const { count } = await client
                  .from('survey_answers')
                  .select('*', { count: 'exact', head: true })
                  .eq('question_id', q.id);
                return { ...q, answer_count: count };
              } else {
                // 客观题：获取每个选项的选择数量
                const optionStats = await Promise.all(
                  (q.survey_options || []).map(async (opt: any) => {
                    const { count } = await client
                      .from('survey_answers')
                      .select('*', { count: 'exact', head: true })
                      .eq('selected_option_id', opt.id);
                    return { ...opt, count: count || 0 };
                  })
                );
                return { ...q, option_stats: optionStats };
              }
            })
          );
        }
        
        return {
          ...survey,
          question_count: questionCount || 0,
          answer_count: answerCount || 0,
          questions: questionStats
        };
      })
    );
    
    return NextResponse.json({ surveys: surveysWithStats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await getAdminSupabaseClient();
    const body = await request.json();
    const { title, description, questions, is_anonymous } = body;
    
    // 获取当前用户
    const userCookie = request.cookies.get('user');
    if (!userCookie) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    
    const user = JSON.parse(decodeURIComponent(userCookie.value));
    const isAdmin = user.role === 'admin' || user.role === 'super_admin' || 
                    (typeof user.role === 'string' && user.role.includes('admin'));
    if (!isAdmin) {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }
    
    // 创建问卷
    const { data: survey, error: surveyError } = await client
      .from('surveys')
      .insert({
        title,
        description,
        is_anonymous: is_anonymous || false,
        created_by: user.id
      })
      .select()
      .limit(1);
    
    if (surveyError) {
      return NextResponse.json({ error: surveyError.message }, { status: 500 });
    }
    
    const surveyId = survey?.[0]?.id;
    if (!surveyId) {
      return NextResponse.json({ error: '创建问卷失败' }, { status: 500 });
    }
    
    // 创建题目
    if (questions && questions.length > 0) {
      const questionsToInsert = questions.map((q: any, index: number) => ({
        survey_id: surveyId,
        question_text: q.question_text,
        question_type: q.question_type || 'choice',
        is_required: q.is_required !== false,
        display_order: index
      }));
      
      const { data: createdQuestions, error: questionsError } = await client
        .from('survey_questions')
        .insert(questionsToInsert)
        .select();
      
      if (questionsError) {
        return NextResponse.json({ error: questionsError.message }, { status: 500 });
      }
      
      // 为客观题创建选项
      for (let i = 0; i < (createdQuestions || []).length; i++) {
        const q = questions[i];
        const createdQ = (createdQuestions || [])[i];
        
        if (q.question_type === 'choice' && q.options && q.options.length > 0) {
          const optionsToInsert = q.options.map((opt: string, optIndex: number) => ({
            question_id: createdQ.id,
            option_text: opt,
            display_order: optIndex
          }));
          
          await client.from('survey_options').insert(optionsToInsert);
        }
      }
    }
    
    // 获取完整的问卷数据
    const { data: fullSurvey } = await client
      .from('surveys')
      .select(`
        *,
        survey_questions (
          *,
          survey_options (*)
        )
      `)
      .eq('id', surveyId)
      .limit(1);
    
    return NextResponse.json({ survey: fullSurvey?.[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
