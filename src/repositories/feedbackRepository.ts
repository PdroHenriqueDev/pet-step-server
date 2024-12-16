import {ObjectId} from 'mongodb';
import MongoConnection from '../database/mongoConnection';
import {UserRole} from '../enums/role';

class FeedbackRepository {
  get db() {
    return MongoConnection.getInstance().getdataBase();
  }

  get feedbackCollection() {
    return this.db.collection('feedback');
  }

  get dogWalkersCollection() {
    return this.db.collection('dogwalker');
  }

  get ownerCollection() {
    return this.db.collection('owner');
  }

  async saveFeedback({
    reviewerId,
    reviewedId,
    rate,
    comment,
    roleOfReviewer,
    roleOfReviewed,
    requestId,
  }: {
    reviewerId: string;
    reviewedId: string;
    rate: number;
    comment: string;
    requestId: string;
    roleOfReviewer: UserRole;
    roleOfReviewed: UserRole;
  }) {
    try {
      const reviewedCollection =
        roleOfReviewed === UserRole.DogWalker
          ? this.dogWalkersCollection
          : this.ownerCollection;

      const reviewedUser = await reviewedCollection.findOne({
        _id: new ObjectId(reviewedId),
      });

      if (!reviewedUser) {
        return {
          status: 404,
          error: `${roleOfReviewed} não encontrado`,
        };
      }

      const newTotalRatings = reviewedUser.totalRatings + 1;
      const newRate = (
        (reviewedUser.rate * reviewedUser.totalRatings + rate) /
        newTotalRatings
      ).toFixed(1);

      await Promise.all([
        this.feedbackCollection.insertOne({
          reviewerId: new ObjectId(reviewerId),
          reviewedId: new ObjectId(reviewedId),
          roleOfReviewer,
          roleOfReviewed,
          rate,
          comment,
          requestId: new ObjectId(requestId),
          createdAt: new Date(),
        }),
        reviewedCollection.updateOne(
          {_id: new ObjectId(reviewedId)},
          {
            $set: {
              rate: parseFloat(newRate),
              totalRatings: newTotalRatings,
            },
          },
        ),
        (roleOfReviewer === UserRole.DogWalker
          ? this.dogWalkersCollection
          : this.ownerCollection
        ).updateOne(
          {_id: new ObjectId(reviewerId)},
          {$set: {pendingReview: null}},
        ),
      ]);

      return {
        status: 200,
        data: 'Feedback feito com sucesso.',
      };
    } catch (error) {
      console.log('Erro saving feedback:', error);
      return {
        status: 500,
        data: 'Erro interno',
      };
    }
  }

  async removePendingFeedback(userId: string, role: UserRole) {
    try {
      const collection =
        role === UserRole.DogWalker
          ? this.dogWalkersCollection
          : this.ownerCollection;

      const user = await collection.findOne({
        _id: new ObjectId(userId),
      });

      if (!user) {
        return {
          status: 404,
          error: `${role} não encontrado`,
        };
      }

      await collection.updateOne(
        {_id: new ObjectId(userId)},
        {$set: {pendingReview: null}},
      );

      return {
        status: 200,
        data: 'Feedback removido com sucesso.',
      };
    } catch (error) {
      console.log('Erro removing feedback:', error);
      return {
        status: 500,
        data: 'Erro interno',
      };
    }
  }
}

export default new FeedbackRepository();
