import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const client = await getAdminSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const isAdmin = searchParams.get('is_admin') === 'true';
    
    // 检查 cookie 获取管理员身份
    const userCookie = request.cookies.get('user');
    let userIsAdmin = false;
    if (userCookie) {
      try {
        const user = JSON.parse(decodeURIComponent(userCookie.value));
        userIsAdmin = user.role === 'admin' || user.role === 'super_admin' || 
                      (typeof user.role === 'string' && user.role.includes('admin'));
      } catch {}
    }
    
    // 获取问卷列表（管理员看所有，普通用户只看活跃的）
    const query = client
      .from('surveys')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!(isAdmin || userIsAdmin)) {
      query.eq('is_active', true);
    }
    
    const { data: surveys, error } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!surveys || surveys.length === 0) {
      return NextResponse.json({ surveys: [] });
    }
    
    // 为每个问卷获取题目数量和回答人数
    const surveysWithStats = await Promise.all(
      surveys.map(async (survey) => {
        // 获取题目数量
        const { count: questionCount } = await client
          .from('survey_questions')
          .select('*', { count: 'exact', head: true })
          .eq('survey_id', survey.id);
        
        // 获取回答人数（通过 survey_questions 关联）
        const { data: questionIds } = await client
          .from('survey_questions')
          .select('id')
          .eq('survey_id', survey.id);
        
        let answerCount = 0;
        if (questionIds && questionIds.length > 0) {
          const qIds = questionIds.map((q: any) => q.id);
          // 获取不重复的 user_id 数量
          const { data: answers } = await client
            .from('survey_answers')
            .select('user_id')
            .in('question_id', qIds);
          
          if (answers) {
            const uniqueUsers = new Set(answers.map((a: any) => a.user_id));
            answerCount = uniqueUsers.size;
          }
        }
        
        // 获取题目和选项
        const { data: questions } = await client
          .from('survey_questions')
          .select(`
            id, question_text, question_type, is_required, display_order,
            survey_options (id, option_text, display_order)
          `)
          .eq('survey_id', survey.id)
          .order('display_order');
        
        return {
          ...survey,
          question_count: questionCount || 0,
          answer_count: answerCount,
          questions: questions || []
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
