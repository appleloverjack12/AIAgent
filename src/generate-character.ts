import { type Character } from '@elizaos/core';
import * as fs from 'fs';
import * as path from 'path';

interface ClientConfig {
  clientId: string;
  clientName: string;
  industry: string;
  agent: {
    name: string;
    avatar?: string;
  };
  knowledge: {
    companyInfo: {
      name: string;
      description: string;
      website: string;
      supportEmail: string;
    };
    products: Array<{
      name: string;
      price: string;
      description: string;
    }>;
    policies: {
      returns: string;
      shipping: string;
      refunds: string;
      warranty: string;
    };
    faqs: Array<{
      question: string;
      answer: string;
    }>;
    commonIssues: Array<{
      issue: string;
      solution: string;
    }>;
  };
  escalation: {
    email: string;
    triggers: string[];
    escalationMessage: string;
  };
}

export function generateCharacter(clientConfig: ClientConfig): Character {
  const knowledgeBase = buildKnowledgeBase(clientConfig);
  const systemPrompt = buildSystemPrompt(clientConfig);
  const messageExamples = buildMessageExamples(clientConfig);

  return {
    name: clientConfig.agent.name,
    plugins: [
      '@elizaos/plugin-sql',
      ...(process.env.OLLAMA_API_ENDPOINT?.trim() ? ['@elizaos/plugin-ollama'] : []),
      ...(process.env.DISCORD_API_TOKEN?.trim() ? ['@elizaos/plugin-discord'] : []),
      ...(process.env.TELEGRAM_BOT_TOKEN?.trim() ? ['@elizaos/plugin-telegram'] : []),
      ...(!process.env.IGNORE_BOOTSTRAP ? ['@elizaos/plugin-bootstrap'] : []),
    ],
    settings: {
      secrets: {},
      avatar: clientConfig.agent.avatar || "",
    },
    system: systemPrompt,
    bio: [
      `Customer support agent for ${clientConfig.knowledge.companyInfo.name}`,
      'Professional, helpful, and available 24/7',
      'Expert in company products and policies',
      'Empathetic communicator who prioritizes customer satisfaction',
    ],
    knowledge: knowledgeBase,
    topics: [
      'order tracking',
      'returns and refunds',
      'product information',
      'account support',
      'billing questions',
      'technical support',
    ],
    messageExamples,
    style: {
      all: [
        'Professional yet friendly',
        'Empathetic and patient',
        'Solution-focused',
        'Clear and concise',
        'Uses positive language',
      ],
      chat: [
        'Responds promptly',
        'Maintains warm tone',
        'Asks clarifying questions when needed',
      ],
    },
  };
}

function buildKnowledgeBase(config: ClientConfig): string[] {
  const knowledge: string[] = [];

  // Company info
  knowledge.push(`Company: ${config.knowledge.companyInfo.name}`);
  knowledge.push(`Description: ${config.knowledge.companyInfo.description}`);
  knowledge.push(`Website: ${config.knowledge.companyInfo.website}`);
  knowledge.push(`Support email: ${config.knowledge.companyInfo.supportEmail}`);

  // Products
  if (config.knowledge.products.length > 0) {
    knowledge.push('\nProducts:');
    config.knowledge.products.forEach(product => {
      knowledge.push(`- ${product.name} (${product.price}): ${product.description}`);
    });
  }

  // Policies
  knowledge.push('\nPolicies:');
  knowledge.push(`Returns: ${config.knowledge.policies.returns}`);
  knowledge.push(`Shipping: ${config.knowledge.policies.shipping}`);
  knowledge.push(`Refunds: ${config.knowledge.policies.refunds}`);
  knowledge.push(`Warranty: ${config.knowledge.policies.warranty}`);

  // FAQs
  if (config.knowledge.faqs.length > 0) {
    knowledge.push('\nFrequently Asked Questions:');
    config.knowledge.faqs.forEach(faq => {
      knowledge.push(`Q: ${faq.question}`);
      knowledge.push(`A: ${faq.answer}`);
    });
  }

  // Common issues
  if (config.knowledge.commonIssues.length > 0) {
    knowledge.push('\nCommon Issues and Solutions:');
    config.knowledge.commonIssues.forEach(issue => {
      knowledge.push(`Issue: ${issue.issue}`);
      knowledge.push(`Solution: ${issue.solution}`);
    });
  }

  // Escalation info
  knowledge.push('\nEscalation Guidelines:');
  knowledge.push(`When to escalate: ${config.escalation.triggers.join(', ')}`);
  knowledge.push(`Escalation message: "${config.escalation.escalationMessage.replace('{{email}}', config.escalation.email)}"`);

  return knowledge;
}

function buildSystemPrompt(config: ClientConfig): string {
  return `You are ${config.agent.name}, the customer support agent for ${config.knowledge.companyInfo.name}.

Your role is to help customers with inquiries about orders, products, returns, and general questions.

Guidelines:
- Always be professional, empathetic, and solution-focused
- Ask clarifying questions when needed (e.g., order number)
- Use the knowledge base to answer accurately
- If you encounter: ${config.escalation.triggers.join(', ')}, escalate to ${config.escalation.email}
- Never make promises you cannot keep
- Always maintain a positive, helpful tone

Company website: ${config.knowledge.companyInfo.website}
Support email: ${config.knowledge.companyInfo.supportEmail}`;
}

function buildMessageExamples(config: ClientConfig): any[] {
  const examples = [
    [
      {
        name: '{{name1}}',
        content: { text: 'Where is my order?' },
      },
      {
        name: config.agent.name,
        content: {
          text: `I'd be happy to help you track your order! Could you please provide your order number? You can find it in your confirmation email from ${config.knowledge.companyInfo.name}.`,
        },
      },
    ],
    [
      {
        name: '{{name1}}',
        content: { text: 'I want a refund' },
      },
      {
        name: config.agent.name,
        content: {
          text: `I understand you'd like to process a refund. I'm here to help! ${config.knowledge.policies.refunds}. To get started, could you please share your order number?`,
        },
      },
    ],
  ];

  // Add FAQ examples if available
  config.knowledge.faqs.slice(0, 2).forEach(faq => {
    examples.push([
      {
        name: '{{name1}}',
        content: { text: faq.question },
      },
      {
        name: config.agent.name,
        content: { text: faq.answer },
      },
    ]);
  });

  return examples;
}

// CLI function to generate character from client config
export async function generateCharacterFromConfig(clientId: string) {
  const configPath = path.join(process.cwd(), 'clients', 'active', `${clientId}.json`);
  
  if (!fs.existsSync(configPath)) {
    throw new Error(`Client config not found: ${configPath}`);
  }

  const config: ClientConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const character = generateCharacter(config);

  // Save character file
  const characterPath = path.join(process.cwd(), 'clients', 'active', `${clientId}-character.ts`);
  const characterContent = `import { type Character } from '@elizaos/core';

export const character: Character = ${JSON.stringify(character, null, 2)};
`;

  fs.writeFileSync(characterPath, characterContent);
  console.log(`✅ Character generated for ${config.clientName}: ${characterPath}`);
  
  return character;
}