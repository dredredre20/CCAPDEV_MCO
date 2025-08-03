describe('Reservation Routes', () => {
  it('prevents student from accessing technician reservations page', async () => {
    const agent = request.agent(app);
    await agent.post('/login').send({ email: 'juan_dela@dlsu.edu.ph', password: 'password123' });
    const res = await agent.get('/reservations/admin'); // Example
    expect(res.status).to.equal(403);
  });

  it('displays availability for students', async () => {
    const agent = request.agent(app);
    await agent.post('/login').send({ email: 'juan_dela@dlsu.edu.ph', password: 'password123' });
    const res = await agent.get('/reservations/availability?laboratory=G301');
    expect(res.status).to.equal(200);
    expect(res.text).to.include('Laboratory Availability');
  });
});
