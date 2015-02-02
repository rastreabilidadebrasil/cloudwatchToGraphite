require('./lib/date');
var AWS = require('aws-sdk');

var ec2 = new AWS.EC2({
  region: 'sa-east-1'
});

var cloudWatch = new AWS.CloudWatch({
  region: 'sa-east-1'
});

var params = {


  MaxResults: 1000
};
ec2.describeInstances(params, function(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else {
    //console.log(JSON.stringify(data));           // successful response
    data.Reservations.forEach(function(reservation) {
      console.log('RESERVATION');
      reservation.Instances.forEach(function(instance) {
        console.log(instance.InstanceId);
        instance.Tags.forEach(function(tag) {
          console.log(tag.Key + '==>' + tag.Value);
        });

      });
    });

  }
});

var cwParams = {
  EndTime: new Date || 'Wed Dec 31 1969 16:00:00 GMT-0800 (PST)' || 123456789,
  /* required */
  MetricName: 'CPUUtilization',
  /* required */
  Namespace: 'AWS/EC2',
  /* required */
  Period: 60,
  /* required */
  StartTime: (2).minutes().ago(),
  /* required */
  Statistics: [ /* required */
    'Average',
    /* more items */
  ],
  Dimensions: [{
        Name: 'InstanceId',
        /* required */
        Value: 'i-ff7da2ea' /* required */
      },
      /* more items */
    ]
    //,Unit: 'Seconds | Microseconds | Milliseconds | Bytes | Kilobytes | Megabytes | Gigabytes | Terabytes | Bits | Kilobits | Megabits | Gigabits | Terabits | Percent | Count | Bytes/Second | Kilobytes/Second | Megabytes/Second | Gigabytes/Second | Terabytes/Second | Bits/Second | Kilobits/Second | Megabits/Second | Gigabits/Second | Terabits/Second | Count/Second | None'
};

cloudWatch.getMetricStatistics(cwParams, function(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else console.log(data); // successful response
});
