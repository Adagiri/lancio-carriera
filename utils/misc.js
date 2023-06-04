module.exports.randomNumbers = (length) => {
  let code = '';
  while (code.length < length) {
    code += Math.floor(Math.random() * (9 - 1 + 1)) + 1;
  }

  return code;
};

module.exports.getQueryArgs = (args) => {
  const filter = args.filter || {};
  // Transform the query if the property 'id' was added
  if (filter.id) {
    filter._id = mongoose.Types.ObjectId(filter.id);

    delete filter.id;
  }
  // Transform the query if the property 'ids' was added
  if (filter.ids) {
    filter._id = { $in: filter.ids.map((id) => mongoose.Types.ObjectId(id)) };
    delete filter.ids;
  }

  // Make sure deleted documents are not selected
  filter.deleted = { $ne: true };

  // Set pagination fields
  const page = parseInt(args.page, 10) || 0;
  const limit = parseInt(args.perPage, 10) || 10;
  const skip = page * limit;

  // Transform sort field
  const sort = {};
  if (args.sortField) {
    sort[args.sortField] = args.sortOrder === 'ASC' ? 1 : -1;
  } else {
    sort.createdAt = -1;
  }

  return { filter, skip, limit, sort };
};