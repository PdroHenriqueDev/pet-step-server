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
                 <p>Se você não solicitou a redefinição, ignore este e-mail.</p>
                 <p><em>Por favor, não responda a este e-mail, pois ele foi gerado automaticamente pelo sistema.</em></p>`,
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
      data: 'Email enviado com sucesso.',
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
                 <p>Se você não solicitou essa verificação, ignore este e-mail.</p>
                 <p><em>Por favor, não responda a este e-mail, pois ele foi gerado automaticamente pelo sistema.</em></p>`,
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

export async function sendApprovalEmail(to: string) {
  const guidelinesLink = 'https://www.petstepapp.com/dog-walker-guidelines';

  const params = {
    Source: 'noreply@petstepapp.com',
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: `
            <p>Olá,</p>
            <p>Parabéns! Sua inscrição como Dog Walker no Pet Step foi aprovada.</p>
            <p>Para garantir a melhor experiência para você e os tutores, por favor, leia atentamente as nossas diretrizes:</p>
            <p><a href="${guidelinesLink}">Guia de Boas Práticas para Dog Walkers</a></p>
            <p>Se tiver alguma dúvida, entre em contato conosco.</p>
            <p>Bem-vindo ao Pet Step!</p>
            <p><em>Por favor, não responda a este e-mail, pois ele foi gerado automaticamente pelo sistema.</em></p>
          `,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: 'Aprovação como Dog Walker - Pet Step',
      },
    },
  };

  try {
    await ses.sendEmail(params).promise();
    return {
      status: 200,
      data: 'E-mail de aprovação enviado com sucesso.',
    };
  } catch (error) {
    console.error('Erro ao enviar o e-mail de aprovação:', error);
    return {
      status: 500,
      data: 'Erro ao enviar o e-mail de aprovação.',
    };
  }
}

export async function sendRejectionEmail({
  to,
  reasons,
}: {
  to: string;
  reasons: string[];
}) {
  const reasonsList = reasons.map(reason => `<li>${reason}</li>`).join('');

  const htmlContent = `
    <p>Olá,</p>
    <p>Infelizmente, após analisar sua inscrição como Dog Walker no Pet Step, não foi possível aprová-la no momento.</p>
    <p>Abaixo estão os motivos:</p>
    <ul>${reasonsList}</ul>
    <p>Se você acredita que houve algum engano ou gostaria de corrigir as informações fornecidas, entre em contato conosco para verificar as possibilidades.</p>
    <p>Agradecemos seu interesse no Pet Step e esperamos poder colaborar no futuro.</p>
    <p><em>Por favor, não responda a este e-mail, pois ele foi gerado automaticamente pelo sistema.</em></p>
  `;

  const params = {
    Source: 'noreply@petstepapp.com',
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: htmlContent,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: 'Sua Inscrição no Pet Step - Resultado',
      },
    },
  };

  try {
    await ses.sendEmail(params).promise();
    return {
      status: 200,
      data: 'E-mail de rejeição enviado com sucesso.',
    };
  } catch (error) {
    console.error('Erro ao enviar o e-mail de rejeição:', error);
    return {
      status: 500,
      data: 'Erro ao enviar o e-mail de rejeição.',
    };
  }
}

export async function sendAccountClosureEmail(
  to: string,
): Promise<{status: number; data: string}> {
  const bodyHtml = `
    <p>Olá,</p>
    <p>Gostaríamos de informar que estamos encerrando as operações do Pet Step. Agradecemos imensamente por fazer parte da nossa plataforma e pela confiança em nossos serviços.</p>
    <p>Se você possui valores pendentes a receber, fique tranquilo: todos os pagamentos serão processados dentro dos prazos estabelecidos.</p>
    <p>Após a liquidação de todos os valores pendentes, sua conta será oficialmente encerrada em nosso sistema. Além disso, todos os seus dados e documentos armazenados em nossa plataforma serão permanentemente excluídos, conforme nossa política de privacidade.</p>
    <p>Se você tiver dúvidas ou precisar de suporte adicional, entre em contato conosco por meio do nosso e-mail de suporte.</p>
    <p><em>Por favor, não responda a este e-mail, pois ele foi gerado automaticamente pelo sistema.</em></p>
  `;

  const params = {
    Source: 'noreply@petstepapp.com',
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: bodyHtml,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: 'Encerramento das Operações - Pet Step',
      },
    },
  };

  try {
    await ses.sendEmail(params).promise();
    return {
      status: 200,
      data: 'E-mail de encerramento enviado com sucesso.',
    };
  } catch (error) {
    console.error('Erro ao enviar o e-mail de encerramento:', error);
    return {
      status: 500,
      data: 'Erro ao enviar o e-mail de encerramento.',
    };
  }
}
