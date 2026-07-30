import swaggerJSDoc from 'swagger-jsdoc';
import { env } from './env.js';

// Schemas mirror the real Postgres columns (introspected from the live DB), not a
// hand-maintained guess — keep this in sync if a migration adds/renames a column.
const schemas = {
    Error: {
        type: 'object',
        properties: { error: { type: 'string' } },
    },
    Profile: {
        type: 'object',
        properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            full_name: { type: 'string', nullable: true },
            avatar_url: { type: 'string', nullable: true },
            role: { type: 'string', enum: ['user', 'admin'] },
            current_streak: { type: 'integer' },
            longest_streak: { type: 'integer' },
            last_study_date: { type: 'string', format: 'date', nullable: true },
            email_verified: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
        },
    },
    AuthResponse: {
        type: 'object',
        properties: {
            user: { $ref: '#/components/schemas/Profile' },
            accessToken: { type: 'string', description: 'Short-lived JWT (~15m). Send as `Authorization: Bearer <token>`.' },
        },
    },
    Topic: {
        type: 'object',
        properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            logo_url: { type: 'string', nullable: true },
            is_visible: { type: 'boolean' },
            sort_order: { type: 'integer' },
            color: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
        },
    },
    Question: {
        type: 'object',
        properties: {
            id: { type: 'string', format: 'uuid' },
            topic_id: { type: 'string', format: 'uuid' },
            topic_name: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string', nullable: true },
            difficulty: { type: 'string', enum: ['basic', 'medium', 'experienced'] },
            type: { type: 'string', enum: ['theory', 'coding', 'mcq', 'scenario', 'interview'] },
            experience_level: { type: 'string' },
            code_snippet: { type: 'string', nullable: true },
            code_language: { type: 'string', nullable: true },
            answer: { type: 'string', nullable: true },
            explanation: { type: 'string', nullable: true },
            options: { type: 'array', items: { type: 'object' }, nullable: true, description: 'MCQ options; each may carry `is_correct` (stripped for quiz-takers).' },
            correct_option_index: { type: 'integer', nullable: true },
            tags: { type: 'array', items: { type: 'string' } },
            company_tags: { type: 'array', items: { type: 'string' } },
            reference_links: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['draft', 'published'] },
            is_visible: { type: 'boolean' },
            round: { type: 'string', enum: ['screening', 'technical', 'manager', 'hr'], nullable: true, description: 'Explicit Mock Interview round tag; NULL falls back to a type/difficulty heuristic.' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
        },
    },
    Company: {
        type: 'object',
        properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            logo_url: { type: 'string', nullable: true },
            color: { type: 'string', nullable: true },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
        },
    },
    RoadmapTopic: {
        type: 'object',
        properties: {
            id: { type: 'string', format: 'uuid' },
            topic_id: { type: 'string', format: 'uuid' },
            phase_name: { type: 'string' },
            phase_order: { type: 'integer' },
            left_nodes: { type: 'array', items: { type: 'string' } },
            right_nodes: { type: 'array', items: { type: 'string' } },
            color: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
        },
    },
    PageVisibility: {
        type: 'object',
        properties: {
            id: { type: 'string', format: 'uuid' },
            page_key: { type: 'string', description: 'Frontend route, e.g. `/mock-interview`.' },
            label: { type: 'string' },
            is_visible: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
        },
    },
    Bookmark: {
        type: 'object',
        properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            question_id: { type: 'string', format: 'uuid' },
            question_title: { type: 'string' },
            topic_name: { type: 'string' },
            difficulty: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
        },
    },
    Note: {
        type: 'object',
        properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            question_id: { type: 'string', format: 'uuid' },
            content: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
        },
    },
    Progress: {
        type: 'object',
        properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            question_id: { type: 'string', format: 'uuid' },
            topic_id: { type: 'string', format: 'uuid' },
            completed_at: { type: 'string', format: 'date-time' },
        },
    },
    ResumeAnalysis: {
        type: 'object',
        properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            file_name: { type: 'string' },
            file_url: { type: 'string' },
            raw_text: { type: 'string' },
            version_label: { type: 'string', nullable: true },
            target_role: { type: 'string', nullable: true },
            skills: { type: 'array', items: { type: 'string' } },
            experience_years: { type: 'number', nullable: true },
            ats_score: { type: 'number', nullable: true },
            jd_match_score: { type: 'number', nullable: true },
            matched_keywords: { type: 'array', items: { type: 'string' } },
            missing_keywords: { type: 'array', items: { type: 'string' } },
            strengths: { type: 'array', items: { type: 'string' } },
            improvements: { type: 'array', items: { type: 'string' } },
            ai_summary: { type: 'string', nullable: true },
            optimized_resume: { type: 'string', nullable: true },
            status: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
        },
    },
    QuizAttempt: {
        type: 'object',
        properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            topic_id: { type: 'string', format: 'uuid', nullable: true },
            topic_name: { type: 'string' },
            difficulty: { type: 'string' },
            total_questions: { type: 'integer' },
            correct_answers: { type: 'integer' },
            wrong_answers: { type: 'integer' },
            score_percentage: { type: 'integer' },
            time_taken: { type: 'integer', description: 'Seconds' },
            answers: { type: 'array', items: { type: 'object' } },
            created_at: { type: 'string', format: 'date-time' },
        },
    },
};

const definition = {
    openapi: '3.0.3',
    info: {
        title: 'TechPrep API',
        version: '1.0.0',
        description:
            'REST API for the TechPrep interview-prep platform: topics, questions, quizzes, ' +
            'mock interviews, resume analysis, bookmarks/notes/progress, and admin content management. ' +
            'Every endpoint except `/auth/*` and `/health` requires a Bearer JWT obtained from login/register.',
    },
    servers: [
        { url: `http://localhost:${env.port}/api`, description: 'Local dev' },
        { url: '/api', description: 'Current origin (use when viewing docs on a deployed backend)' },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Access token returned by /auth/login, /auth/register, or /auth/refresh. Expires in ~15 minutes.',
            },
        },
        schemas,
    },
    security: [{ bearerAuth: [] }],
    tags: [
        { name: 'Auth', description: 'Register, login, session refresh, password reset, Google OAuth' },
        { name: 'Profiles', description: 'Current user profile + admin user management' },
        { name: 'Content', description: 'Topics, questions, companies, roadmap topics, page visibility (admin-writable, viewer-readable)' },
        { name: 'User Data', description: 'Per-user bookmarks, notes, progress, resume analyses' },
        { name: 'Quiz', description: 'Server-graded quiz flow (answer keys never sent to the client mid-quiz)' },
        { name: 'AI', description: 'Groq LLM proxy used by Mock Interview feedback, Resume Analyzer, and Code Editor' },
        { name: 'Uploads', description: 'Topic logo and resume file uploads' },
    ],
};

export const swaggerSpec = swaggerJSDoc({
    definition,
    apis: ['./src/routes/*.js'],
});
