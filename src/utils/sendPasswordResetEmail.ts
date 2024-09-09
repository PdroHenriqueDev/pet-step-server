import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

const ses = new AWS.SES({
  region: process.env?.AWS_REGION,
  accessKeyId: process.env?.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env?.AWS_SECRET_ACCESS_KEY,
});

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetLink = `https://yourapp.com/reset-password?token=${token}`;

  const params = {
    Source: 'noreply@petstepapp.com',
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: `<p>Olá,</p>
                 <p>Você solicitou a redefinição de sua senha. Clique no link abaixo para redefinir sua senha:</p>
                 <a href="${resetLink}">Redefinir senha</a>
                 <p>Se você não solicitou a redefinição, ignore este e-mail.</p>`,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: 'Recuperação de Senha - Pet Step',
      },
    },
  };

  try {
    const test = await ses.sendEmail(params).promise();
    console.log('got here', test);
    return {
      status: 200,
      data: 'Email enviado com sucesso',
    };
  } catch (error) {
    console.log('Erro ao enviar o email:', error);
    return {
      status: 500,
      data: 'Erro ao enviar o email:',
    };
  }
}
