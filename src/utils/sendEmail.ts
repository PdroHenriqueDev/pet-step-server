import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

const ses = new AWS.SES({
  region: process.env?.AWS_REGION,
  accessKeyId: process.env?.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env?.AWS_SECRET_ACCESS_KEY,
});

export async function sendPasswordResetEmail({
  to,
  token,
}: {
  to: string;
  token: string;
}) {
  const resetLink = `${process.env.PET_STEP_FRONT}/reset-password?token=${token}`;

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
                 <p><strong>Importante:</strong> O link é válido por apenas 1 hora. Após esse período, ele expirará e você precisará solicitar um novo link para redefinir sua senha.</p>
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
    await ses.sendEmail(params).promise();

    return {
      status: 200,
      data: 'Email enviado com sucesso',
    };
  } catch (error) {
    console.log('Erro sending email:', error);
    return {
      status: 500,
      data: 'Erro ao enviar o email:',
    };
  }
}

export async function sendEmailVerification({
  to,
  token,
}: {
  to: string;
  token: string;
}) {
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
                 <p>Obrigado por se registrar no Pet Step! Por favor, confirme seu e-mail clicando no link abaixo:</p>
                 <a href="${process.env.PET_STEP_FRONT}/verify-email?token=${token}">Verificar E-mail</a>
                 <p><strong>Importante:</strong> Este link é válido por 1 hora. Após esse período, você precisará solicitar um novo link para confirmar seu e-mail.</p>
                 <p>Se você não solicitou essa verificação, ignore este e-mail.</p>`,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: 'Confirmação de E-mail - Pet Step',
      },
    },
  };

  try {
    await ses.sendEmail(params).promise();

    return {
      status: 200,
      data: 'Email de verificação enviado com sucesso',
    };
  } catch (error) {
    console.error('Error sending e-mail verification:', error);
    return {
      status: 500,
      data: 'Erro ao enviar o email de verificação',
    };
  }
}
