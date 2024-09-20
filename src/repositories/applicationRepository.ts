import {ObjectId} from 'mongodb';
import MongoConnection from '../database/mongoConnection';
import {RepositoryResponse} from '../interfaces/apitResponse';
import {uploadToS3} from '../utils/uploadImage';
import {
  DocumentReviewStatus,
  DogWalkerApplicationStatus,
} from '../enums/dogWalkerApplicationStatus';
import {DocumentType} from '../types/document';

class ApplicationRepository {
  get db() {
    return MongoConnection.getInstance().getdataBase();
  }

  get dogWalkerApplicationCollection() {
    return this.db.collection('dogWalkerApplication');
  }

  get dogWalkersCollection() {
    return this.db.collection('dogwalkers');
  }

  currentDate = new Date();

  async addDocument(
    dogwalkerId: string,
    documentType: DocumentType,
    file: Express.Multer.File,
  ): Promise<RepositoryResponse> {
    try {
      const applicationExists =
        await this.dogWalkerApplicationCollection.findOne({
          dogWalkerId: new ObjectId(dogwalkerId),
        });

      const documentUrl = 'url-some-place';

      // const fileType = file.mimetype.split('/')[1];
      // const documentUrl = await uploadToS3(file.buffer, fileType);

      if (applicationExists) {
        await this.updateDogWalkerDocument(
          dogwalkerId,
          documentType,
          documentUrl,
        );

        return {
          status: 200,
          data: `Documento ${documentType} atualizado com sucesso`,
        };
      }

      await this.createDogWalkerApplication(
        dogwalkerId,
        documentType,
        documentUrl,
      );

      return {
        status: 200,
        data: `Aplicação criada e documento ${documentType} enviado com sucesso`,
      };
    } catch (error) {
      console.log(
        `Erro ao processar o documento do tipo ${documentType} para o Dog Walker ID ${dogwalkerId}:`,
        error,
      );
      return {
        status: 500,
        data: 'Erro interno ao processar o documento',
      };
    }
  }

  private async createDogWalkerApplication(
    dogwalkerId: string,
    documentType: DocumentType,
    documentUrl: string,
  ) {
    const data = {
      dogWalkerId: new ObjectId(dogwalkerId),
      documents: {
        [documentType]: {
          path: documentUrl,
          status: DocumentReviewStatus.Pending,
        },
      },
      createdAt: this.currentDate,
      updatedAt: this.currentDate,
    };

    await this.dogWalkerApplicationCollection.insertOne(data);
  }

  private async updateDogWalkerDocument(
    dogwalkerId: string,
    documentType: DocumentType,
    documentUrl: string,
  ) {
    const updateField = `documents.${documentType}`;
    await this.dogWalkerApplicationCollection.updateOne(
      {dogWalkerId: new ObjectId(dogwalkerId)},
      {
        $set: {
          [updateField]: {
            path: documentUrl,
            status: DocumentReviewStatus.Pending,
          },
          updatedAt: this.currentDate,
        },
      },
    );
  }

  async aboutMeDogWalker(
    dogwalkerId: string,
    aboutMe: string,
  ): Promise<RepositoryResponse> {
    try {
      await this.dogWalkerApplicationCollection.updateOne(
        {dogWalkerId: new ObjectId(dogwalkerId)},
        {
          $set: {
            aboutMe,
            updatedAt: this.currentDate,
          },
        },
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
      };

      const allDocumentsSent = Object.values(documentStatus).every(
        status => status === true,
      );

      if (
        allDocumentsSent &&
        application.status === DogWalkerApplicationStatus.PendingDocuments
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
}

export default new ApplicationRepository();
