require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configurado para aceitar file://
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());

// Verificar API Key
if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ERRO: ANTHROPIC_API_KEY não encontrada no .env');
    process.exit(1);
}

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const STATIC_SOURCES = [
    'Código Civil português',
    'Lei n.º 61/2008 (Regime jurídico do divórcio)',
    'Código do Registo Civil',
    'Jurisprudência dos Tribunais Superiores'
];

const STATIC_RESPONSE_FIELDS = {
    category: 'Direito da Família',
    jurisdiction: 'Portugal',
    caselaw: 'Consulte jurisprudência específica conforme o caso concreto nos tribunais superiores.',
    model: 'claude-sonnet-4'
};

// Rota de busca jurídica
app.post('/api/search', async (req, res) => {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query é obrigatória' });
        }

        console.log('📩 Nova consulta recebida:', query);

        const prompt = `Você é um assistente jurídico especializado. Responda à seguinte consulta jurídica de forma técnica e fundamentada:

${query}

Forneça sua resposta em português de forma clara e estruturada, incluindo:
1. Explicação técnica e completa
2. Base legal (leis, códigos, regulamentos relevantes)
3. Jurisprudência relevante quando aplicável
4. Considerações práticas importantes`;

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });

        const responseText = message.content[0].text;
        
        // Criar resposta estruturada
        const response = {
            title: query.length > 100 ? query.substring(0, 97) + '...' : query,
            content: responseText,
            sources: STATIC_SOURCES,
            ...STATIC_RESPONSE_FIELDS,
            timestamp: new Date().toISOString(),
            query: query
        };

        console.log('✅ Resposta enviada com sucesso');
        res.json(response);

    } catch (error) {
        console.error('❌ Erro ao processar consulta:', error);
        res.status(500).json({
            error: 'Erro ao processar consulta',
            message: error.message,
            details: error.toString()
        });
    }
});

// Rota de health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        model: 'claude-sonnet-4'
    });
});

// Rota raiz
app.get('/', (req, res) => {
    res.json({ 
        message: 'Advogamos AI 3.0 API',
        status: 'online',
        endpoints: {
            search: 'POST /api/search',
            health: 'GET /health'
        }
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log('\n🚀 ============================================');
    console.log('🚀  ADVOGAMOS AI 3.0 - API INICIADA');
    console.log('🚀 ============================================');
    console.log(`🚀  Servidor rodando na porta: ${PORT}`);
    console.log('🚀  URL: http://localhost:${PORT}');
    console.log('🚀  Ambiente: production');
    console.log('🚀  Claude API: ✅ Configurada');
    console.log('🚀  CORS: ✅ Habilitado (*)');
    console.log('🚀  Modelo: claude-sonnet-4');
    console.log('🚀 ============================================\n');
});
