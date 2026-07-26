import { apiRequest } from './client';

export async function sendChatMessage(message: string, tripContext?: any) {
  return apiRequest('/gemini/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      tripContextJson: tripContext ? JSON.stringify(tripContext) : null,
    }),
  });
}
