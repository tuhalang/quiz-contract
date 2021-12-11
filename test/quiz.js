const QuizToken = artifacts.require("QuizToken");
const QuizGame = artifacts.require("QuizGame");

contract("QuizGame", accounts => {

    const tax = 0;
    const totalReward = 100000000000000;
    const rewardQuiz = 10000000000;
    const rewardVote = 10000000000;
    const key = "0x9799b1543ac4484013bc605dad27748cf477ac0d0c705d2f10cda31c351e2564";
    const randomKey = "0x738ff84fc1ee609d833e664bd363bfbf220b093709c77187d63ed883e731dc52";

    function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    let quizToken;
    let quizGame;
    beforeEach(async () => {
        quizToken = await QuizToken.new();
        quizGame = await QuizGame.new(quizToken.address, tax, totalReward, rewardQuiz, rewardVote, key);
        await quizToken.transfer(quizGame.address, totalReward, {
            from: accounts[0]
        });
    });

    describe("createQuizWithAnswer", async () => {
        it("should execute", async () => {
            const res = await quizGame.createNewQuizWithAnswer("1+1=?", "2", {
                from: accounts[1],
                value: 100,
            });

            const { logs } = res;

            assert.equal(logs[0].event, "RewardContributor");
            assert.equal(logs[0].args["amount"].toNumber(), rewardQuiz);

            assert.equal(logs[1].event, "CreateQuiz");
            assert.equal(logs[1].args["owner"], accounts[1])
        })
    });

    describe("createQuizWithNoAnswer", async () => {
        it("should execute", async () => {
            const res = await quizGame.createNewQuizNoAnswer("1+1=?", 10, 20, {
                from: accounts[1],
                value: 100,
            })

            const { logs } = res;

            assert.equal(logs[0].event, "RewardContributor");
            assert.equal(logs[1].event, "CreateQuiz");
            assert.equal(logs[0].args[1].toNumber(), rewardQuiz);
        });
    });

    describe("predictAnswer", async () => {
        let quizAnswerId;
        let quizNoAnswerId;
        const duration = 5;
        const durationVote = 10;
        const question = "1+1=?";
        const correctAnswer = "2";

        beforeEach(async () => {
            const resAnswer = await quizGame.createNewQuizWithAnswer(question, correctAnswer, {
                from: accounts[1],
                value: 100,
            });
            quizAnswerId = resAnswer.logs[1].args["id"];

            const resNoAnswer = await quizGame.createNewQuizNoAnswer(question, duration, durationVote, {
                from: accounts[1],
                value: 100,
            })
            quizNoAnswerId = resNoAnswer.logs[1].args["id"];
        })

        it("should execute", async () => {
            const resAnswer = await quizGame.predictAnswer(quizAnswerId, "2");
            assert.equal(resAnswer.logs[0].event, "PredictAnswer");

            const resNoAnswer = await quizGame.predictAnswer(quizNoAnswerId, "2");
            assert.equal(resNoAnswer.logs[0].event, "PredictAnswer");

            await timeout(duration * 1000);
            const resAnswer1 = await quizGame.predictAnswer(quizAnswerId, "2");
            assert.equal(resAnswer1.logs[0].event, "PredictAnswer");
        })

        it("shouldn't execute because out of time", async () => {
            await timeout(duration * 1000);
            try {
                await quizGame.predictAnswer(quizNoAnswerId, "2");
                throw new Error("tx did not fail");
            } catch (error) {
                assert.equal(error.reason, "Have finished");
            }
        })

        it("shouldn't execute because quiz is not exists", async () => {
            try {
                await quizGame.predictAnswer(randomKey, "2");
                throw new Error("tx did not fail");
            } catch (error) {
                assert.equal(error.reason, "Not exists");
            }
        })

        it("shouldn't execute because owner cannot predict", async () => {
            try {
                await quizGame.predictAnswer(quizAnswerId, "2", {
                    from: accounts[1]
                });
                throw new Error("tx did not fail");
            } catch (error) {
                assert.equal(error.reason, "Not allow owner predict");
            }
        })
    })

    describe("Voting", async () => {
        let quizNoAnswerId;
        let predictionId;
        let index;
        const duration = 5;
        const durationVote = 10;
        const question = "1+1=?";
        beforeEach(async () => {
            const resNoAnswer = await quizGame.createNewQuizNoAnswer(question, duration, durationVote, {
                from: accounts[1],
                value: 100,
            })
            quizNoAnswerId = resNoAnswer.logs[1].args["id"];

            const resPredict = await quizGame.predictAnswer(quizNoAnswerId, "2");
            predictionId = resPredict.logs[0].args["id"];
            index = resPredict.logs[0].args["index"];
        })

        it("shouldn't execute because it's not time yet", async () => {
            try {
                await quizGame.voting(quizNoAnswerId, predictionId, index);
                throw new Error("tx did not fail");
            } catch (error) {
                assert.equal(error.reason, "Haven't finished");
            }
        })

        it("should execute", async () => {
            await timeout(duration * 1000);
            const res = await quizGame.voting(quizNoAnswerId, predictionId, index);

            assert.equal(res.logs[0].event, "RewardContributor");
            assert.equal(res.logs[0].args["amount"], rewardVote);

            assert.equal(res.logs[1].event, "Vote");
        })
    })
})