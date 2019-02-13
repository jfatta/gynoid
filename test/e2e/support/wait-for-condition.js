const waitForCondition = (condition, timeout, conditionName) => {
  return new Promise((resolve, reject) => {
    let done = false;
    setTimeout(() => {
      done = true;
      reject(new Error(`timeout exceeded waiting for "${conditionName}"`));
    }, timeout);
    const checkCondition = () => {
      condition()
        .then(result => {
          if (result) {
            done = true;
            resolve();
          } else {
            if (!done) {
              setTimeout(checkCondition, 10);
            }
          }
        })
        .catch(error => {
          done = true;
          reject(error)
        });
    };
    checkCondition();
  });
};

module.exports = waitForCondition;
