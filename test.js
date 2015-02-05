var Q = require('Q');
var AWS = require('aws-sdk');
var awsPromiseWrapper = require('./awsPromise')
var _ = require('lodash');

var ec2 = new AWS.EC2({
  region: 'sa-east-1'
});

var cloudWatch = new AWS.CloudWatch({
  region: 'sa-east-1'
});

var metricsConfig = {
  ec2: {},
  ebs: {},
  elb: {},
  sqs: {},
  linux: {}
}

metricsConfig.ec2.metrics = ['CPUUtilization', 'NetworkIn', 'NetworkOut'];

metricsConfig.ebs.metrics = ['VolumeIdleTime', 'VolumeQueueLength', 'VolumeReadBytes', 'VolumeReadOps', 'VolumeTotalReadTime', 'VolumeTotalWriteTime',
  'VolumeWriteBytes',
  'VolumeWriteOps'
];

metricsConfig.elb.metrics = ['BackendConnectionErrors', 'HTTPCode_Backend_2XX', 'HTTPCode_Backend_4XX', 'HTTPCode_Backend_5XX', 'HTTPCode_ELB_4XX',
  'HealthyHostCount',
  'Latency', 'RequestCount', 'SurgeQueueLength', 'UnHealthyHostCount'
];

metricsConfig.sqs.metrics = ['ApproximateNumberOfMessagesDelayed', 'ApproximateNumberOfMessagesNotVisible', 'ApproximateNumberOfMessagesVisible',
  'NumberOfEmptyReceives',
  'NumberOfMessagesDeleted', 'NumberOfMessagesReceived', 'NumberOfMessagesSent'
];

metricsConfig.linux.metrics = ['MemoryAvailable', 'MemoryUsed', 'MemoryUtilization', 'SwapUsed', 'SwapUtilization', 'DiskSpaceAvailable', 'DiskSpaceUsed',
  'DiskSpaceUtilization'
];

var params = {

  Filters: [{
      Name: 'tag-key',
      Values: [
        'Name'
      ]
    }

  ]
};

var elements = {};

Q.all([awsPromiseWrapper.describeInstances(params), awsPromiseWrapper.describeVolumes(params)]).then(function(data) {

  elements.instances = [];
  _.map(data[0].Reservations, function(reservation) {
    _.map(reservation.Instances, function(instance) {
      //console.log(instance.BlockDeviceMappings);
      var server = {
        id: instance.InstanceId
      };
      elements.instances.push(server);
      _.map(instance.Tags, function(tag) {
        server[tag.Key] = tag.Value;
      })
    });
  });

}).then(function() {
  //console.log(elements.instances);
  elements.instances.forEach(function(server) {
    awsPromiseWrapper.listMetrics({
      Dimensions: [{
          Name: 'InstanceId',
          Value: 'i-ff7da2ea'
        }

      ]
    }).done(function(data) {
      data.Metrics.forEach(function(metric) {
        var EndTime = new Date

        var cwParams = {
          EndTime: EndTime,
          MetricName: metric.MetricName,
          //Namespace: 'AWS/EC2',
          Namespace: metric.Namespace,
          Period: 60,
          StartTime: new Date(EndTime.getTime() - 1 * 60 * 1000),
          Statistics: [
            'Average',
            'Sum'
          ],
          Dimensions: metric.Dimensions

        };

        awsPromiseWrapper.getMetricStatistics(cwParams).done(function(data) {
          data.Datapoints.forEach(function(point) {
            var metricName = metric.MetricName + '_' + _.result(_.find(metric.Dimensions, {
              'Name': 'MountPath'
            }), 'Value');

            var uri = metric.Namespace + '.' + server.Type + '.' + server.Name + '.' + metricName + '.' + point.Unit +
              '_average'

            uri = uri.replace('/', '_').replace(' ', '_').toLowerCase();
            console.log(uri + ' ' + point.Average + ' ' + point.Timestamp.getTime());
          });
        });

      });
    });
  });
});

/*awsPromiseWrapper.describeVolumes(params).done(function(data) {

  //console.log(JSON.stringify(data));           // successful response
  data.Volumes.forEach(function(volume) {

    console.log(volume.VolumeId);
    volume.Tags.forEach(function(tag) {
      console.log(tag.Key + '==>' + tag.Value);
    });


  });


});*/


// ec2.describeInstances(params, function(err, data) {
//   if (err) console.log(err, err.stack); // an error occurred
//   else {
//     //console.log(JSON.stringify(data));           // successful response
//     data.Reservations.forEach(function(reservation) {
//       //console.log('RESERVATION');
//       reservation.Instances.forEach(function(instance) {
//         console.log(instance.InstanceId);
//         instance.Tags.forEach(function(tag) {
//           console.log(tag.Key + '==>' + tag.Value);
//         });
//
//       });
//     });
//
//   }
// });

// var ec2Promise = Q.nfbind(ec2.describeInstances);
//
// ec2Promise(params).done(function(reservation) {
//   console.log('PRomise');
//   reservation.Instances.forEach(function(instance) {
//     console.log(instance.InstanceId);
//     instance.Tags.forEach(function(tag) {
//       console.log(tag.Key + '==>' + tag.Value);
//     });
//
//   });
// });


//
// var EndTime = new Date
//
// var cwParams = {
//   EndTime: EndTime,
//   MetricName: 'DiskSpaceAvailable',
//   //Namespace: 'AWS/EC2',
//   Namespace: 'System/Linux',
//   Period: 60,
//   StartTime: new Date(EndTime.getTime() - 1 * 60 * 1000),
//   Statistics: [
//     'Average',
//     'Sum'
//   ],
//   Dimensions: [{
//     Name: 'Filesystem',
//     Value: '/dev/xvdc1'
//   }, {
//     Name: 'InstanceId',
//     Value: 'i-ff7da2ea'
//   }, {
//     Name: 'MountPath',
//     Value: '/mongojournal'
//   }]
//
// };

// elements.instances.forEach(function(server) {
//
// });
//
// cloudWatch.getMetricStatistics(cwParams, function(err, data) {
//   if (err) console.log(err, err.stack); // an error occurred
//   else console.log(data); // successful response
// });
//
//
// params = {
//   Dimensions: [{
//       Name: 'InstanceId',
//       Value: 'i-ff7da2ea'
//     }
//
//   ]
// };
// cloudWatch.listMetrics({
//   Dimensions: [{
//       Name: 'InstanceId',
//       Value: 'i-ff7da2ea'
//     }
//
//   ]
// }, function(err, data) {
//   data.Metrics.forEach(function(metric) {
//     console.log(metric)
//   });
// });
