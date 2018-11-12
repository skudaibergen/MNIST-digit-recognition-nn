import fs from 'fast-csv';

export const loadMnistData = fileName => {
  const data = [];

  let promise = new Promise((resolve, reject) => {
    let i = 0;

    fs.fromPath(fileName)
      .on("data", row => {
        console.log('row loaded: ', ++i)

        if (row.length)
          data.push(row);
      })
      .on("end", () => resolve(data));
  });

  return promise;
}
