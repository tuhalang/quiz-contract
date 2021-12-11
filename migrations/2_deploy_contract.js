const QuizToken = artifacts.require("QuizToken");
const QuizGame  = artifacts.require("QuizGame");

module.exports = (deployer, network, accounts) => {

    const tax = 0;
    const totalReward = 100000000000000;
    const rewardQuiz = 10000000000;
    const rewardVote = 10000000000;
    const key = "0x9799b1543ac4484013bc605dad27748cf477ac0d0c705d2f10cda31c351e2564";

    deployer.deploy(QuizToken)
            .then(() => deployer.deploy(QuizGame, QuizToken.address, tax, totalReward, rewardQuiz, rewardVote, key));
}