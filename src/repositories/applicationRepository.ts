import {ObjectId} from 'mongodb';
import MongoConnection from '../database/mongoConnection';
import {RepositoryResponse} from '../interfaces/apitResponse';
import {getSignedUrl, uploadToS3} from '../utils/s3Utils';
import {
  DocumentReviewStatus,
  DogWalkerApplicationStatus,
} from '../enums/dogWalkerApplicationStatus';
import {DocumentType} from '../types/document';
import {DogWalkerProfile} from '../interfaces/application';
import {v4 as uuidv4} from 'uuid';

class ApplicationRepository {
  get db() {
    return MongoConnection.getInstance().getdataBase();
  }

  get dogWalkerApplicationCollection() {
    return this.db.collection('dogWalkerApplication');
  }

  get dogWalkersCollection() {
    return this.db.collection('dogwalker');
  }

  currentDate = new Date();

  async addDocument(
    dogWalkerId: string,
    documentType: DocumentType,
    file: Express.Multer.File,
  ): Promise<RepositoryResponse> {
    try {
      const key = `${uuidv4()}-${file.originalname.replace(/\s+/g, '-')}`;

      await uploadToS3({
        fileBuffer: file.buffer,
        key,
        storageClass: 'STANDARD_IA',
        fileType: file.mimetype,
        bucketName: process.env.S3_BUCKET_NAME as string,
      });

      const documentData = {
        path: key,
        status: DocumentReviewStatus.Pending,
      };

      await this.dogWalkerApplicationCollection.updateOne(
        {
          dogWalkerId: new ObjectId(dogWalkerId),
        },
        {
          $set: {
            [`documents.${documentType}`]: documentData,
            updatedAt: this.currentDate,
          },
          $setOnInsert: {
            status: DogWalkerApplicationStatus.PendingDocuments,
            createdAt: this.currentDate,
          },
        },
        {upsert: true},
      );

      return {
        status: 200,
        data: 'Documento enviado com sucesso',
      };
    } catch (error) {
      console.log(
        `Erro ao processar o documento do tipo ${documentType} para o Dog Walker ID ${dogWalkerId}:`,
        error,
      );
      return {
        status: 500,
        data: 'Erro interno ao processar o documento',
      };
    }
  }

  async aboutMeDogWalker(
    dogWalkerId: string,
    aboutMe: string,
  ): Promise<RepositoryResponse> {
    try {
      await this.dogWalkerApplicationCollection.updateOne(
        {dogWalkerId: new ObjectId(dogWalkerId)},
        {
          $set: {
            aboutMe,
            updatedAt: this.currentDate,
          },
        },
        {upsert: true},
      );

      return {
        status: 200,
        data: 'Enviado com sucesso',
      };
    } catch (error) {
      console.log('Error sending about me field', error);
      return {
        status: 500,
        data: 'Erro ao enviar o campo sobre mim',
      };
    }
  }

  async addProfile({
    dogWalkerId,
    transport,
    availability,
    dogExperience,
  }: DogWalkerProfile): Promise<RepositoryResponse> {
    try {
      const profile = {
        transport,
        availability,
        dogExperience,
      };

      await this.dogWalkerApplicationCollection.updateOne(
        {dogWalkerId: new ObjectId(dogWalkerId)},
        {
          $set: {
            profile,
            updatedAt: this.currentDate,
          },
        },
        {upsert: true},
      );

      return {
        status: 200,
        data: 'Enviado com sucesso',
      };
    } catch (error) {
      console.log('Error sending about me field', error);
      return {
        status: 500,
        data: 'Erro ao enviar o profile',
      };
    }
  }

  async verifyDocuments(dogwalkerId: string): Promise<RepositoryResponse> {
    try {
      const application = await this.dogWalkerApplicationCollection.findOne({
        dogWalkerId: new ObjectId(dogwalkerId),
      });

      if (!application) {
        const response = {
          status: 200,
          data: {
            allDocumentsSent: false,
            documentStatus: {
              document: false,
              selfie: false,
              residence: false,
              criminalRecord: false,
              profile: false,
            },
          },
        };

        return response;
      }

      const documentStatus = {
        document: !!application.documents?.document,
        selfie: !!application.documents?.selfie,
        residence: !!application.documents?.residence,
        criminalRecord: !!application.documents?.criminalRecord,
        aboutMe: !!application.aboutMe,
        profile: !!application.profile,
      };

      const allDocumentsSent = Object.values(documentStatus).every(
        status => status === true,
      );

      if (
        (allDocumentsSent &&
          application.status === DogWalkerApplicationStatus.PendingDocuments) ||
        (allDocumentsSent && !application.status)
      ) {
        await Promise.all([
          this.dogWalkerApplicationCollection.updateOne(
            {dogWalkerId: new ObjectId(dogwalkerId)},
            {
              $set: {
                status: DogWalkerApplicationStatus.PendingReview,
                updatedAt: this.currentDate,
              },
            },
          ),
          this.dogWalkersCollection.updateOne(
            {_id: new ObjectId(dogwalkerId)},
            {
              $set: {
                status: DogWalkerApplicationStatus.PendingReview,
                updatedAt: this.currentDate,
              },
            },
          ),
        ]);
      }

      const response = {
        status: 200,
        data: {
          allDocumentsSent,
          documentStatus,
        },
      };

      return response;
    } catch (error) {
      console.log(
        `Internal error while verifying documents ${dogwalkerId}:`,
        error,
      );
      return {
        status: 500,
        data: 'Erro interno',
      };
    }
  }

  async updateStatus(
    dogwalkerId: string,
    status: DogWalkerApplicationStatus,
  ): Promise<RepositoryResponse> {
    if (!Object.values(DogWalkerApplicationStatus).includes(status)) {
      return {
        status: 400,
        data: 'Status inválido',
      };
    }

    const application = await this.dogWalkerApplicationCollection.findOne({
      dogWalkerId: new ObjectId(dogwalkerId),
    });

    const dogWalker = await this.dogWalkersCollection.findOne({
      _id: new ObjectId(dogwalkerId),
    });

    if (!application || !dogWalker)
      return {
        status: 400,
        data: 'Aplicação não encontrada',
      };

    await Promise.all([
      this.dogWalkerApplicationCollection.updateOne(
        {dogWalkerId: new ObjectId(dogwalkerId)},
        {
          $set: {
            status,
            updatedAt: this.currentDate,
          },
        },
      ),
      this.dogWalkersCollection.updateOne(
        {_id: new ObjectId(dogwalkerId)},
        {
          $set: {
            status,
            updatedAt: this.currentDate,
          },
        },
      ),
    ]);

    return {
      status: 200,
      data: 'Atualizado com sucesso',
    };
  }

  async getDogWalkerApplication(
    dogWalkerId: string,
  ): Promise<RepositoryResponse> {
    try {
      const application = await this.dogWalkerApplicationCollection.findOne({
        dogWalkerId: new ObjectId(dogWalkerId),
      });

      if (!application) {
        return {
          status: 404,
          data: 'Aplicação não encontrada',
        };
      }

      const documents = [
        'document',
        'selfie',
        'residence',
        'criminalRecord',
      ].reduce(
        (acc, docType) => {
          const document = application.documents?.[docType];
          if (document) {
            acc[docType] = {...document, url: getSignedUrl(document.path)};
          }
          return acc;
        },
        {} as Record<string, unknown>,
      );
      return {
        status: 200,
        data: documents,
      };
    } catch (error) {
      console.log(
        `Error fetching application and documents for Dog Walker ID ${dogWalkerId}:`,
        error,
      );
      return {
        status: 500,
        data: 'Erro interno ao buscar a aplicação e documentos',
      };
    }
  }

  async deactivateAccount(dogwalkerId: string): Promise<RepositoryResponse> {
    try {
      await Promise.all([
        this.dogWalkerApplicationCollection.updateOne(
          {dogWalkerId: new ObjectId(dogwalkerId)},
          {
            $set: {
              status: DogWalkerApplicationStatus.Deactivated,
              updatedAt: this.currentDate,
            },
          },
        ),
        this.dogWalkersCollection.updateOne(
          {_id: new ObjectId(dogwalkerId)},
          {
            $set: {
              status: DogWalkerApplicationStatus.Deactivated,
              updatedAt: this.currentDate,
            },
          },
        ),
      ]);

      return {
        status: 200,
        data: 'Conta e aplicação desativadas com sucesso',
      };
    } catch (error) {
      console.log('Erro ao desativar conta e aplicação', error);
      return {
        status: 500,
        data: 'Erro ao desativar conta e aplicação',
      };
    }
  }

  async listApplicationsByStatus(
    status: DogWalkerApplicationStatus,
    page: number = 1,
    limit: number = 10,
  ): Promise<RepositoryResponse> {
    try {
      const skip = (page - 1) * limit;

      const query =
        status === DogWalkerApplicationStatus.PendingDocuments
          ? {
              $or: [
                {status: DogWalkerApplicationStatus.PendingDocuments},
                {status: {$exists: false}},
              ],
            }
          : {status};

      const applications = await this.dogWalkerApplicationCollection
        .find(query)
        .skip(skip)
        .limit(limit)
        .toArray();

      const totalApplications =
        await this.dogWalkerApplicationCollection.countDocuments(query);

      return {
        status: 200,
        data: {
          applications,
          pagination: {
            page,
            limit,
            total: totalApplications,
            totalPages: Math.ceil(totalApplications / limit),
          },
        },
      };
    } catch (error) {
      console.log(`Error fetching applications by status ${status}:`, error);
      return {
        status: 500,
        data: 'Erro interno',
      };
    }
  }
}

export default new ApplicationRepository();
